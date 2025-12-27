import { and, asc, eq, isNull, lt, relations, sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { getDb } from "../index";
import { contractorLicenses } from "./contractor_licenses";

// --- Schema ---

export const contractorsMaster = sqliteTable("contractors_master", {
  id: text("id").primaryKey(),
  nameCanonical: text("name_canonical").notNull(),
  nameAliases: text("name_aliases").notNull(), // JSON string
  companyName: text("company_name"),
  contactName: text("contact_name"),
  addressLine: text("address_line"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  phone: text("phone"),
  email: text("email"),
  data: text("data").notNull(), // JSON string
  markdownSummary: text("markdown_summary"),
  firstSeenAt: integer("first_seen_at", { mode: "timestamp" }).notNull(),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull(),
  complaintsPerYear: real("complaints_per_year").notNull().default(0),
  permitVolume: integer("permit_volume").notNull().default(0),
  avgApprovalTime: real("avg_approval_time"),
  uniqueAddressCount: integer("unique_address_count").notNull().default(0),
  topNeighborhoods: text("top_neighborhoods"), // JSON string
  lastVectorizedAt: integer("last_vectorized_at", { mode: "timestamp" }),
  vectorChunkCount: integer("vector_chunk_count").notNull().default(0),
  lastUpdated: integer("last_updated", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const contractorsMasterRelations = relations(contractorsMaster, ({ many }) => ({
  licenses: many(contractorLicenses),
}));

// --- Logic ---

export async function upsertContractor(
    env: Env,
    masterData: {
        id: string; // Pre-generated ID often passed in
        nameCanonical: string;
        data: any;
        lastSeenAt: Date;
        firstSeenAt: Date;
        // Enrichment fields
        companyName?: string;
        contactName?: string;
        addressLine?: string;
        city?: string;
        state?: string;
        zip?: string;
        phone?: string;
        email?: string;
        // extended fields
        markdownSummary?: string;
        topNeighborhoods?: any;
        permitVolume?: number;
        complaintsPerYear?: number;
    },
    licenseNumber?: string
) {
    const db = getDb(env);

    // 1. Try to find existing by Canonical Name
    // Using FindFirst logic from original code.
    let existing = await db.query.contractorsMaster.findFirst({
        where: eq(contractorsMaster.nameCanonical, masterData.nameCanonical)
    });

    let contractorId: string | undefined = existing?.id;

    if (existing) {
        contractorId = existing.id;
        // Update existing
        // Check if we need to update aliases or merge data? 
        // Original code just updated data, lastSeenAt etc.
        await db.update(contractorsMaster)
            .set({
                lastSeenAt: masterData.lastSeenAt,
                data: JSON.stringify(masterData.data),
                companyName: masterData.companyName || existing.companyName,
                contactName: masterData.contactName || existing.contactName,
                addressLine: masterData.addressLine || existing.addressLine,
                city: masterData.city || existing.city,
                state: masterData.state || existing.state,
                zip: masterData.zip || existing.zip,
                phone: masterData.phone || existing.phone,
                email: masterData.email || existing.email,
                markdownSummary: masterData.markdownSummary || existing.markdownSummary,
                topNeighborhoods: masterData.topNeighborhoods ? JSON.stringify(masterData.topNeighborhoods) : existing.topNeighborhoods,
                permitVolume: masterData.permitVolume !== undefined ? masterData.permitVolume : existing.permitVolume,
                complaintsPerYear: masterData.complaintsPerYear !== undefined ? masterData.complaintsPerYear : existing.complaintsPerYear,
                lastUpdated: new Date()
            })
            .where(eq(contractorsMaster.id, contractorId));
    } else {
        // Create new
        contractorId = masterData.id;
        await db.insert(contractorsMaster).values({
            id: contractorId,
            nameCanonical: masterData.nameCanonical,
            nameAliases: "[]",
            data: JSON.stringify(masterData.data),
            firstSeenAt: masterData.firstSeenAt,
            lastSeenAt: masterData.lastSeenAt,
            companyName: masterData.companyName,
            contactName: masterData.contactName,
            addressLine: masterData.addressLine,
            city: masterData.city,
            state: masterData.state,
            zip: masterData.zip,
            phone: masterData.phone,
            email: masterData.email,
            markdownSummary: masterData.markdownSummary,
            topNeighborhoods: masterData.topNeighborhoods ? JSON.stringify(masterData.topNeighborhoods) : null,
            permitVolume: masterData.permitVolume || 0,
            complaintsPerYear: masterData.complaintsPerYear || 0,
            lastUpdated: new Date()
        });
    }

    // 4. Upsert License
    if (licenseNumber && contractorId) {
        // Check for existing license record matching number AND contractor (to be safe? or just number?)
        // Original code: where licenseNumber AND contractorId.
        const licenseRecord = await db.query.contractorLicenses.findFirst({
            where: and(
                eq(contractorLicenses.licenseNumber, licenseNumber),
                eq(contractorLicenses.contractorId, contractorId)
            )
        });

        if (licenseRecord) {
            await db.update(contractorLicenses)
                .set({ lastSeenAt: new Date() })
                .where(eq(contractorLicenses.id, licenseRecord.id));
        } else {
            // Need UUID for license? Or auto-increment? Schema says id TEXT.
            // Original code likely relied on Prisma UUID default or passed in?
            // "prisma.contractorLicense.create" usually auto-generates if @default(uuid()).
            // Since Drizzle strict manual insert, we need a UUID.
            // I'll use crypto.randomUUID() which is available in Workers.
            // But wait, make sure to import it or rely on global? 
            // Workers has crypto global.
            await db.insert(contractorLicenses).values({
                id: crypto.randomUUID(),
                contractorId: contractorId,
                licenseNumber: licenseNumber,
                firstSeenAt: new Date(),
                lastSeenAt: new Date()
            });
        }
    }

    return contractorId;
}

export async function getContractor(env: Env, id: string) {
    const db = getDb(env);
    return db.query.contractorsMaster.findFirst({
        where: eq(contractorsMaster.id, id),
        with: {
            licenses: true
        }
    });
}

export async function findStaleContractors(env: Env, limit: number = 5) {
    const db = getDb(env);

    // 1. Never Vectorized
    // lastVectorizedAt is null
    const never = await db.select().from(contractorsMaster)
        .where(isNull(contractorsMaster.lastVectorizedAt))
        .limit(limit);
    
    if (never.length >= limit) {
        return never;
    }

    // 2. Old/Stale Vectorization 
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const remaining = limit - never.length;

    const stale = await db.select().from(contractorsMaster)
        .where(lt(contractorsMaster.lastVectorizedAt, oneDayAgo))
        .orderBy(asc(contractorsMaster.lastVectorizedAt))
        .limit(remaining);

    return [...never, ...stale];
}

export async function updateLastVectorized(env: Env, id: string, vectorChunkCount?: number) {
    const db = getDb(env);
    const updates: any = { lastVectorizedAt: new Date() };
    if (vectorChunkCount !== undefined) {
        updates.vectorChunkCount = vectorChunkCount;
    }
    
    await db.update(contractorsMaster)
        .set(updates)
        .where(eq(contractorsMaster.id, id));
}
