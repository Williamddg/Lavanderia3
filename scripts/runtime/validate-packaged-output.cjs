const fs = require('node:fs');
const path = require('node:path');
const asar = require('@electron/asar');

const targetDir = process.argv[2] || path.join(process.cwd(), 'release', 'win-unpacked');
const resourcesDir = path.join(targetDir, 'resources');
const appAsarPath = path.join(resourcesDir, 'app.asar');
const appAsarUnpackedDir = path.join(resourcesDir, 'app.asar.unpacked');

const staticChecks = [
  {
    key: 'app_asar',
    required: true,
    file: appAsarPath,
    message: 'app.asar del bundle principal'
  },
  {
    key: 'mysqldump',
    required: true,
    file: path.join(resourcesDir, 'bin', 'mysqldump.exe'),
    message: 'mysqldump.exe empaquetado'
  },
  {
    key: 'runtime_dir',
    required: false,
    file: path.join(resourcesDir, 'runtime'),
    message: 'directorio runtime para credenciales externas'
  }
];

const runtimeModuleChecks = [
  { module: 'mysql2', criticality: 'boot' },
  { module: 'mysql2/promise', criticality: 'boot' },
  { module: 'kysely', criticality: 'boot' },
  { module: 'electron-store', criticality: 'boot' },
  { module: 'googleapis', criticality: 'feature' },
  { module: 'node-machine-id', criticality: 'boot' },
  { module: '@supabase/supabase-js', criticality: 'optional' }
];

if (!fs.existsSync(targetDir)) {
  console.error(`[runtime:validate] No existe el directorio objetivo: ${targetDir}`);
  console.error('[runtime:validate] Ejecuta primero npm run dist:win (genera win-unpacked).');
  process.exit(1);
}

let hasErrors = false;

for (const check of staticChecks) {
  const exists = fs.existsSync(check.file);
  if (!exists && check.required) {
    hasErrors = true;
    console.error(`[runtime:validate][ERROR] Falta ${check.message}: ${check.file}`);
    continue;
  }

  if (!exists) {
    console.warn(`[runtime:validate][WARN] No se encontró ${check.message}: ${check.file}`);
    continue;
  }

  console.log(`[runtime:validate][OK] ${check.message}: ${check.file}`);
}

let asarEntries = [];
if (fs.existsSync(appAsarPath)) {
  asarEntries = asar.listPackage(appAsarPath);
}

const hasModuleInAsar = (moduleName) => {
  const modulePackagePath = `node_modules/${moduleName}/package.json`;
  return asarEntries.includes(modulePackagePath);
};

const hasModuleInUnpacked = (moduleName) => {
  const unpackedPackage = path.join(appAsarUnpackedDir, 'node_modules', ...moduleName.split('/'), 'package.json');
  return fs.existsSync(unpackedPackage);
};

for (const check of runtimeModuleChecks) {
  const found = hasModuleInAsar(check.module) || hasModuleInUnpacked(check.module);
  if (found) {
    console.log(`[runtime:validate][OK] módulo runtime presente: ${check.module}`);
    continue;
  }

  if (check.criticality === 'boot') {
    hasErrors = true;
    console.error(`[runtime:validate][ERROR] módulo crítico faltante: ${check.module}`);
    continue;
  }

  console.warn(`[runtime:validate][WARN] módulo no crítico faltante: ${check.module}`);
}

if (hasErrors) {
  process.exit(1);
}

console.log('[runtime:validate] Validación completada sin errores críticos.');
