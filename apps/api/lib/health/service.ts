import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { healthIncidents, healthTestDefinitions, healthTestResults } from "../db/schema";

import { HEALTH_CHECKS, type HealthCheckResult } from "./registry";

export class HealthService {
  constructor(private env: Env) {}

  async runAllChecks(): Promise<Record<string, HealthCheckResult>> {
    const results: Record<string, HealthCheckResult> = {};

    // 1. Run Registry Checks
    for (const check of HEALTH_CHECKS) {
      const start = Date.now();
      let result: HealthCheckResult;
      try {
        result = await check.fn(this.env);
      } catch (err: any) {
        result = {
          status: "FAIL",
          latencyMs: Date.now() - start,
          error: err.message || String(err),
        };
      }

      await this.recordResult(null, check.id, result);
      await this.handleIncident(null, check.id, result);
      results[check.id] = result;
    }

    // 2. Run Database Definitions
    try {
      const db = getDb(this.env);
      const dbTests = await db.select().from(healthTestDefinitions).where(eq(healthTestDefinitions.enabled, true));
      
      for (const test of dbTests) {
        if (test.method === "GET") {
          const start = Date.now();
          let result: HealthCheckResult;
          try {
            const res = await fetch(test.target, { method: "GET" });
            const latency = Date.now() - start;
            if (res.status === test.expectedStatus) {
              result = { status: "PASS", latencyMs: latency };
            } else {
              result = {
                status: "FAIL",
                latencyMs: latency,
                error: `Expected status ${test.expectedStatus}, got ${res.status}`,
              };
            }
          } catch (err: any) {
            result = {
              status: "FAIL",
              latencyMs: Date.now() - start,
              error: err.message || String(err),
            };
          }
          await this.recordResult(test.id, test.name, result);
          await this.handleIncident(test.id, test.name, result);
          results[test.name] = result;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch/run DB health definitions", e);
    }

    return results;
  }

  private async recordResult(
    definitionId: string | null,
    name: string,
    result: HealthCheckResult,
  ) {
    const db = getDb(this.env);
    try {
      await db.insert(healthTestResults).values({
        id: crypto.randomUUID(),
        definitionId: definitionId ?? undefined, // Drizzle expects string | undefined, not null usually for optional fields if not nullable? Check schema.
        name: name,
        ok: result.status === "PASS",
        latencyMs: result.latencyMs,
        error: result.error,
        statusCode: result.status === "PASS" ? 200 : 500,
        createdAt: new Date()
      });
    } catch (e) {
      console.error("Failed to record health result", e);
    }
  }

  private async handleIncident(
    definitionId: string | null,
    name: string,
    result: HealthCheckResult,
  ) {
    const db = getDb(this.env);
    try {
      if (result.status === "FAIL") {
        // Check if active incident exists
        const activeIncident = await db.select().from(healthIncidents).where(
            and(
                definitionId ? eq(healthIncidents.definitionId, definitionId) : eq(healthIncidents.name, name),
                eq(healthIncidents.active, true)
            )
        ).get();

        if (activeIncident) {
          await db.update(healthIncidents)
            .set({ 
                count: activeIncident.count + 1, // count is not increment operator in drizzle directly like prisma {increment:1}. Need to read value or use sql?
                // Drizzle update: count: sql`${healthIncidents.count} + 1`
                // But simplified: 
                lastError: result.error 
            })
            // Can use sql for increment
            .set({
                count: sql`${healthIncidents.count} + 1`,
                lastError: result.error
            })
            .where(eq(healthIncidents.id, activeIncident.id));
        } else {
          await db.insert(healthIncidents).values({
            id: crypto.randomUUID(),
            definitionId: definitionId ?? undefined,
            name: name,
            lastError: result.error,
            active: true,
            openedAt: new Date(),
            count: 1
          });
        }
      } else {
        // Close active incident if passed
        const activeIncident = await db.select().from(healthIncidents).where(
            and(
                definitionId ? eq(healthIncidents.definitionId, definitionId) : eq(healthIncidents.name, name),
                eq(healthIncidents.active, true)
            )
        ).get();

        if (activeIncident) {
          await db.update(healthIncidents)
            .set({ active: false, resolvedAt: new Date() })
            .where(eq(healthIncidents.id, activeIncident.id));
        }
      }
    } catch (e) {
      console.error("Failed to handle incident", e);
    }
  }

  async getHistory(limit = 50) {
    const db = getDb(this.env);
    // Drizzle relation query or just explicit join?
    // Using query builder:
    return db.query.healthTestResults.findMany({
      limit: limit,
      orderBy: desc(healthTestResults.createdAt),
      with: {
        definition: true
      }
    });
  }

  async getIncidents(activeOnly = true) {
    const db = getDb(this.env);
    return db.query.healthIncidents.findMany({
      where: activeOnly ? eq(healthIncidents.active, true) : undefined,
      orderBy: desc(healthIncidents.openedAt),
      with: {
        definition: true
      }
    });
  }
}
