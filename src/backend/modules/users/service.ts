import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Kysely } from 'kysely';
import type { Database } from '../../db/schema.js';
import type { SellerUser, SellerUserUpdateInput } from '../../../shared/types.js';

const updateSchema = z.object({
  fullName: z.string().trim().min(3),
  username: z.string().trim().min(3),
  password: z.string().trim().min(3).nullable().optional()
});

const mapSeller = (row: any): SellerUser => ({
  id: row.id,
  fullName: String(row.full_name ?? ''),
  username: String(row.username ?? ''),
  password: ''
});

export const createUsersService = (db: Kysely<Database>) => ({
  async listSellers(): Promise<SellerUser[]> {
    const rows = await db
      .selectFrom('users as u')
      .innerJoin('roles as r', 'r.id', 'u.role_id')
      .select(['u.id', 'u.full_name', 'u.username'])
      .where('u.is_active', '=', 1)
      .where('u.role_id', '!=', 1)
      .orderBy('u.full_name')
      .execute();

    return rows.map(mapSeller);
  },

  async updateSeller(id: number, input: SellerUserUpdateInput): Promise<SellerUser> {
    const parsed = updateSchema.parse(input);

    const target = await db
      .selectFrom('users')
      .select(['id', 'role_id'])
      .where('id', '=', id)
      .executeTakeFirst();

    if (!target) {
      throw new Error('Usuario no encontrado.');
    }

    if (Number(target.role_id) === 1) {
      throw new Error('No se puede editar este usuario desde este módulo.');
    }

    const existingUsername = await db
      .selectFrom('users')
      .select('id')
      .where('username', '=', parsed.username)
      .where('id', '!=', id)
      .executeTakeFirst();

    if (existingUsername) {
      throw new Error('Ese nombre de usuario ya está en uso.');
    }

    const nextPassword = String(parsed.password ?? '').trim();
    const values: Record<string, unknown> = {
      full_name: parsed.fullName,
      username: parsed.username
    };

    if (nextPassword) {
      values.password_hash = await bcrypt.hash(nextPassword, 10);
    }

    await db
      .updateTable('users')
      .set(values as any)
      .where('id', '=', id)
      .execute();

    await db
      .insertInto('audit_logs')
      .values({
        action: 'USER_UPDATE',
        entity_type: 'user',
        entity_id: String(id),
        details_json: JSON.stringify({
          updatedByModule: 'users',
          fullName: parsed.fullName,
          username: parsed.username,
          passwordChanged: Boolean(nextPassword)
        })
      })
      .execute();

    const updated = await db
      .selectFrom('users')
      .select(['id', 'full_name', 'username'])
      .where('id', '=', id)
      .executeTakeFirstOrThrow();

    return mapSeller(updated);
  }
});
