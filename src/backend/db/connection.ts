import { Kysely, MysqlDialect } from 'kysely';
import { loadMysqlRuntime } from '../../shared/mysql-runtime-loader.js';
import type { Database } from './schema.js';
import type { DbConnectionConfig } from '../../shared/types.js';

const mysql = loadMysqlRuntime();

export const createDb = (config: DbConnectionConfig) => new Kysely<Database>({
  dialect: new MysqlDialect({
    pool: mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl ? {} : undefined,
      decimalNumbers: true,
      connectionLimit: 10
    })
  })
});
