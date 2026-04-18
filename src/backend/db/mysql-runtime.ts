export type Mysql2Module = typeof import('mysql2');
export type Mysql2PromiseModule = typeof import('mysql2/promise');

let mysql2Module: Mysql2Module | null = null;
let mysql2PromiseModule: Mysql2PromiseModule | null = null;

export const loadMysql2 = (): Mysql2Module => {
  if (mysql2Module) {
    return mysql2Module;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mysql2Module = require('mysql2') as Mysql2Module;
    return mysql2Module;
  } catch (error) {
    throw new Error(
      `No fue posible cargar mysql2 en runtime. Verifica dependencies y empaquetado. ${
        error instanceof Error ? error.message : ''
      }`.trim()
    );
  }
};

export const loadMysql2Promise = (): Mysql2PromiseModule => {
  if (mysql2PromiseModule) {
    return mysql2PromiseModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mysql2PromiseModule = require('mysql2/promise') as Mysql2PromiseModule;
    return mysql2PromiseModule;
  } catch (error) {
    throw new Error(
      `No fue posible cargar mysql2/promise en runtime. Verifica dependencies y empaquetado. ${
        error instanceof Error ? error.message : ''
      }`.trim()
    );
  }
};
