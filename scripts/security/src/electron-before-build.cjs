const { spawnSync } = require('node:child_process');
const path = require('node:path');

module.exports = async function beforeBuild() {
  const entry = path.join(__dirname, '..', 'dist', 'pipeline-entry.cjs');
  const result = spawnSync(process.execPath, [entry, '--mode=dist-hook'], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  if ((result.status ?? 1) !== 0) {
    throw new Error('Validación de clave maestra falló en hook beforeBuild.');
  }
};
