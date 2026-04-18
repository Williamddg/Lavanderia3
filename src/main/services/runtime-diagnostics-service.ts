import fs from 'node:fs';
import { app } from 'electron';
import type { RuntimeCheck, RuntimeDiagnostics } from '../../shared/types.js';
import {
  firstExistingPath,
  resolvePackagedResourcePath,
  resolveDevPath
} from '../utils/runtime-paths.js';

const resolveModulePath = (moduleId: string) => {
  try {
    return require.resolve(moduleId);
  } catch {
    return null;
  }
};

const checkModule = (
  key: string,
  moduleId: string,
  message: string,
  required: boolean,
  statusWhenMissing: RuntimeCheck['status']
): RuntimeCheck => {
  const resolvedPath = resolveModulePath(moduleId);

  if (!resolvedPath) {
    return {
      key,
      status: statusWhenMissing,
      message,
      resolvedPath: null,
      required
    };
  }

  return {
    key,
    status: 'ok',
    message: `Módulo ${moduleId} detectado.`,
    resolvedPath,
    required
  };
};

const checkMysqldump = (): RuntimeCheck => {
  const resolvedPath = firstExistingPath([
    resolvePackagedResourcePath('bin', 'mysqldump.exe'),
    resolveDevPath('resources', 'bin', 'mysqldump.exe'),
    resolvePackagedResourcePath('bin', 'mysqldump'),
    resolveDevPath('resources', 'bin', 'mysqldump')
  ]);

  if (resolvedPath) {
    return {
      key: 'mysqldump',
      status: 'ok',
      message: 'mysqldump disponible para backups SQL.',
      resolvedPath,
      required: true
    };
  }

  return {
    key: 'mysqldump',
    status: 'error',
    message: 'mysqldump no está disponible. El backup SQL fallará.',
    resolvedPath: null,
    required: true
  };
};

const checkGoogleOauth = (): RuntimeCheck => {
  const resolvedPath = firstExistingPath([
    resolvePackagedResourcePath('runtime', 'google-oauth.json'),
    resolvePackagedResourcePath('google-oauth.json'),
    resolveDevPath('resources', 'runtime', 'google-oauth.json'),
    resolveDevPath('google-oauth.json')
  ]);

  if (!resolvedPath) {
    return {
      key: 'google_oauth',
      status: 'warning',
      message: 'google-oauth.json no existe. Google Drive backup quedará deshabilitado.',
      resolvedPath: null,
      required: false
    };
  }

  try {
    JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
    return {
      key: 'google_oauth',
      status: 'ok',
      message: 'google-oauth.json disponible.',
      resolvedPath,
      required: false
    };
  } catch {
    return {
      key: 'google_oauth',
      status: 'error',
      message: 'google-oauth.json existe pero no es JSON válido.',
      resolvedPath,
      required: false
    };
  }
};

const checkPrinterModule = (): RuntimeCheck => {
  const resolvedPath = resolveModulePath('@alexssmusica/node-printer');

  if (process.platform !== 'win32') {
    return {
      key: 'node_printer',
      status: 'warning',
      message: 'node-printer se usa solo en Windows.',
      resolvedPath,
      required: false
    };
  }

  if (!resolvedPath) {
    return {
      key: 'node_printer',
      status: 'error',
      message: 'No se encontró @alexssmusica/node-printer para impresión/cajón.',
      resolvedPath: null,
      required: true
    };
  }

  return {
    key: 'node_printer',
    status: 'ok',
    message: 'Módulo nativo de impresión detectado.',
    resolvedPath,
    required: true
  };
};

export const getRuntimeDiagnostics = (): RuntimeDiagnostics => ({
  platform: process.platform,
  isPackaged: app.isPackaged,
  appPath: app.getAppPath(),
  resourcesPath: process.resourcesPath,
  checks: [
    checkMysqldump(),
    checkGoogleOauth(),
    checkModule(
      'mysql2',
      'mysql2',
      'No se encontró mysql2. La app no podrá crear pools de conexión MySQL.',
      true,
      'error'
    ),
    checkModule(
      'mysql2_promise',
      'mysql2/promise',
      'No se encontró mysql2/promise. Fallarán pruebas y configuración de conexión.',
      true,
      'error'
    ),
    checkModule(
      'kysely',
      'kysely',
      'No se encontró kysely. El acceso a datos fallará.',
      true,
      'error'
    ),
    checkModule(
      'electron_store',
      'electron-store',
      'No se encontró electron-store. La configuración local no estará disponible.',
      true,
      'error'
    ),
    checkModule(
      'googleapis',
      'googleapis',
      'No se encontró googleapis. El backup en Drive quedará deshabilitado.',
      false,
      'warning'
    ),
    checkModule(
      'node_machine_id',
      'node-machine-id',
      'No se encontró node-machine-id. Fallará la identificación de hardware.',
      true,
      'error'
    ),
    checkModule(
      'supabase',
      '@supabase/supabase-js',
      'No se encontró @supabase/supabase-js. Las funciones de telemetría/sync opcionales no estarán disponibles.',
      false,
      'warning'
    ),
    checkPrinterModule()
  ]
});
