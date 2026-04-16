import { sql, type Kysely } from 'kysely';
import type { Database } from '../../db/schema.js';
import type { AuditDay, AuditEntry } from '../../../shared/types.js';

export const createAuditService = (db: Kysely<Database>) => {
  const listDays = async (): Promise<AuditDay[]> => {
    const rows = await db
      .selectFrom('audit_logs')
      .select([
        sql<string>`DATE(created_at)`.as('date'),
        sql<number>`COUNT(*)`.as('count')
      ])
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`, 'desc')
      .limit(90)
      .execute();

    return rows.map((row) => ({
      date: String(row.date),
      count: Number(row.count)
    }));
  };

  const listByDay = async (date: string): Promise<AuditEntry[]> => {
    const rows = await db
      .selectFrom('audit_logs')
      .selectAll()
      .where(sql`DATE(created_at)`, '=', date)
      .orderBy('id', 'desc')
      .limit(500)
      .execute();

    return rows.map((row) => ({
      id: row.id,
      action: String(row.action ?? ''),
      entityType: String(row.entity_type ?? ''),
      entityId: String(row.entity_id ?? ''),
      details: row.details_json ? (() => {
        try { return JSON.parse(String(row.details_json)); } catch { return null; }
      })() : null,
      createdAt: new Date(row.created_at).toISOString()
    }));
  };

  return { listDays, listByDay };
};
