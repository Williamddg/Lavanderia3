const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_MAIN_DEPS = ['kysely', 'mysql2', 'electron-store', 'bcryptjs', 'zod', 'dayjs'];

const depExists = (dep, searchRoots) => {
  return searchRoots.some((root) => fs.existsSync(path.join(root, dep, 'package.json')));
};

module.exports = async function verifyMainRuntimeDeps(context) {
  const resourcesDir = path.join(context.appOutDir, 'resources');
  const appDir = path.join(resourcesDir, 'app');
  const distElectronMain = path.join(appDir, 'dist-electron', 'main', 'main.js');

  if (!fs.existsSync(distElectronMain)) {
    throw new Error(
      `[PACK-CHECK] No existe ${distElectronMain}. Verifica que dist-electron se copie al paquete.`
    );
  }

  const searchRoots = [
    path.join(appDir, 'node_modules'),
    path.join(resourcesDir, 'node_modules')
  ];

  const missing = REQUIRED_MAIN_DEPS.filter((dep) => !depExists(dep, searchRoots));

  if (missing.length > 0) {
    throw new Error(
      `[PACK-CHECK] Faltan dependencias runtime del proceso principal: ${missing.join(', ')}.`
    );
  }

  console.log(
    `[PACK-CHECK] OK runtime deps main en: ${searchRoots.join(' | ')}`
  );
};
