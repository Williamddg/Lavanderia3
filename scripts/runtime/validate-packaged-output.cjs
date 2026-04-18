const fs = require('node:fs');
const path = require('node:path');

const targetDir = process.argv[2] || path.join(process.cwd(), 'release', 'win-unpacked');
const resourcesDir = path.join(targetDir, 'resources');
const checks = [
  {
    key: 'app_asar',
    required: true,
    file: path.join(resourcesDir, 'app.asar'),
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

if (!fs.existsSync(targetDir)) {
  console.error(`[runtime:validate] No existe el directorio objetivo: ${targetDir}`);
  console.error('[runtime:validate] Ejecuta primero npm run dist:win (genera win-unpacked).');
  process.exit(1);
}

let hasErrors = false;
for (const check of checks) {
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

if (hasErrors) {
  process.exit(1);
}

console.log('[runtime:validate] Validación completada sin errores críticos.');
