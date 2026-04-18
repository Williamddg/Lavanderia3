const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const winMysqldump = path.join(root, 'resources', 'bin', 'mysqldump.exe');
const unixMysqldump = path.join(root, 'resources', 'bin', 'mysqldump');
const oauthRuntime = path.join(root, 'resources', 'runtime', 'google-oauth.json');
const oauthRoot = path.join(root, 'google-oauth.json');

const hasMysqldump = fs.existsSync(winMysqldump) || fs.existsSync(unixMysqldump);
const hasOauth = fs.existsSync(oauthRuntime) || fs.existsSync(oauthRoot);

if (!hasMysqldump) {
  console.error(
    '[runtime:check] Falta mysqldump. Agrega resources/bin/mysqldump.exe (Windows) o resources/bin/mysqldump (Unix).'
  );
  process.exit(1);
}

if (!hasOauth) {
  console.warn(
    '[runtime:check] No se encontró google-oauth.json en resources/runtime ni en la raíz. La app compilará, pero el backup a Google Drive quedará deshabilitado hasta agregar credenciales.'
  );
}

console.log('[runtime:check] OK - assets críticos presentes.');
