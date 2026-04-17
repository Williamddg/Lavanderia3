const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_MAIN_DEPS = [
  'kysely',
  'mysql2',
  'electron-store',
  'bcryptjs',
  'zod',
  'dayjs'
];

module.exports = async function verifyMainRuntimeDeps(context) {
  const appDir = path.join(context.appOutDir, 'resources', 'app');
  const distElectronMain = path.join(appDir, 'dist-electron', 'main', 'main.js');

  if (!fs.existsSync(distElectronMain)) {
    throw new Error(
      `[PACK-CHECK] No existe ${distElectronMain}. Verifica que dist-electron se copie al paquete.`
    );
  }

  const missing = REQUIRED_MAIN_DEPS.filter((dep) => {
    const depPkg = path.join(appDir, 'node_modules', dep, 'package.json');
    return !fs.existsSync(depPkg);
  });

  if (missing.length > 0) {
    throw new Error(
      `[PACK-CHECK] Faltan dependencias runtime del proceso principal: ${missing.join(', ')}.`
    );
  }

  console.log(`[PACK-CHECK] OK runtime deps main: ${REQUIRED_MAIN_DEPS.join(', ')}`);
};
