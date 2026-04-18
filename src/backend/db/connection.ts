import { Kysely, MysqlDialect } from 'kysely';
import type { Database } from './schema.js';
import { loadMysql2 } from './mysql-runtime.js';
import type { DbConnectionConfig } from '../../shared/types.js';

export const createDb = (config: DbConnectionConfig) => {
  const mysql = loadMysql2();

  return new Kysely<Database>({
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
};
