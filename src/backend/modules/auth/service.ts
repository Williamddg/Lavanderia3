import { z } from 'zod';
import { sql, type Kysely } from 'kysely';
import bcrypt from 'bcryptjs';
import type { Database } from '../../db/schema.js';
import type { LoginInput, SessionUser } from '../../../shared/types.js';
import { getCurrentSessionUserId } from '../../../main/services/session-context.js';

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(3)
});

const passwordSchema = z.object({
  password: z.string().min(3)
});

export const createAuthService = (db: Kysely<Database>) => ({
  async login(input: LoginInput): Promise<SessionUser> {
    const parsed = schema.parse(input);
    const user = await db
      .selectFrom('users as u')
      .innerJoin('roles as r', 'r.id', 'u.role_id')
      .select([
        'u.id',
        'u.username',
        'u.role_id',
        'u.password_hash',
        'u.full_name',
        sql<string>`r.name`.as('role_name')
      ])
      .where('u.username', '=', parsed.username)
      .where('u.is_active', '=', 1)
      .executeTakeFirst();

    const isBcryptHash = Boolean(user?.password_hash?.startsWith('$2'));
    const passwordMatches = user
      ? isBcryptHash
        ? await bcrypt.compare(parsed.password, user.password_hash)
        : user.password_hash === parsed.password
      : false;

    if (!user || !passwordMatches) {
      // Log failed login attempt (best-effort, don't let this error propagate)
      await db
        .insertInto('audit_logs')
        .values({
          user_id: null,
          action: 'LOGIN_FAILED',
          entity_type: 'user',
          entity_id: '0',
          details_json: JSON.stringify({ username: parsed.username })
        })
        .execute()
        .catch(() => {});
      throw new Error('Credenciales inválidas.');
    }

    if (user && !isBcryptHash) {
      await db
        .updateTable('users')
        .set({
          password_hash: await bcrypt.hash(parsed.password, 10)
        })
        .where('id', '=', user.id)
        .execute();
    }

    await db
      .insertInto('audit_logs')
      .values({
        user_id: user.id,
        action: 'LOGIN_SUCCESS',
        entity_type: 'user',
        entity_id: String(user.id),
        details_json: JSON.stringify({ username: user.username })
      })
      .execute();

    return {
      id: user.id,
      username: user.username,
      roleId: user.role_id,
      roleName: user.role_name,
      displayName: user.full_name
    };
  },

  async verifyPassword(password: string): Promise<{ valid: boolean }> {
    const parsed = passwordSchema.parse({ password });

    const setting = await db
      .selectFrom('app_settings')
      .select(['id', 'setting_value'])
      .where('setting_key', '=', 'order_protection_password')
      .executeTakeFirst();

    if (!setting || String(setting.setting_value ?? '') !== parsed.password) {
      throw new Error('Contraseña administrativa incorrecta.');
    }

    await db
      .insertInto('audit_logs')
      .values({
        user_id: getCurrentSessionUserId(),
        action: 'ORDER_PROTECTION_PASSWORD_SUCCESS',
        entity_type: 'app_settings',
        entity_id: String(setting.id),
        details_json: JSON.stringify({
          settingKey: 'order_protection_password'
        })
      })
      .execute();

    return { valid: true };
  }
});
