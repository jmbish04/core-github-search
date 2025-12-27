import { eq, relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { getDb } from "../index";
import { contractorsMaster } from "./contractors_master";

// --- Schema ---

export const contractorLicenses = sqliteTable("contractor_licenses", {
  id: text("id").primaryKey(),
  contractorId: text("contractor_id").notNull().references(() => contractorsMaster.id, { onDelete: "cascade" }),
  licenseNumber: text("license_number").notNull(),
  firstSeenAt: integer("first_seen_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const contractorLicensesRelations = relations(contractorLicenses, ({ one }) => ({
  contractor: one(contractorsMaster, {
    fields: [contractorLicenses.contractorId],
    references: [contractorsMaster.id],
  }),
}));

// --- Logic ---

export async function getContractorByLicense(env: Env, license: string) {
    const db = getDb(env);
    const licenseRec = await db.query.contractorLicenses.findFirst({
        where: eq(contractorLicenses.licenseNumber, license),
        with: {
            contractor: true
        }
    });
    return licenseRec?.contractor ?? null;
}
