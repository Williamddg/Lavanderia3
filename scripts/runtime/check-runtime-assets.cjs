const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const winMysqldump = path.join(root, 'resources', 'bin', 'mysqldump.exe');
const unixMysqldump = path.join(root, 'resources', 'bin', 'mysqldump');
const oauthRuntime = path.join(root, 'resources', 'runtime', 'google-oauth.json');
const oauthRoot = path.join(root, 'google-oauth.json');
const mysqldumpLicense = path.join(root, 'resources', 'bin', 'LICENSE.mysqldump.txt');

const checks = [];

const hasMysqldump = fs.existsSync(winMysqldump) || fs.existsSync(unixMysqldump);
const hasOauth = fs.existsSync(oauthRuntime) || fs.existsSync(oauthRoot);
const hasMysqldumpLicense = fs.existsSync(mysqldumpLicense);

const pushCheck = (status, message) => {
  checks.push({ status, message });
  const prefix = status === 'error' ? '[runtime:check][ERROR]' : status === 'warning' ? '[runtime:check][WARN]' : '[runtime:check][OK]';
  const writer = status === 'error' ? console.error : status === 'warning' ? console.warn : console.log;
  writer(`${prefix} ${message}`);
};

if (!hasMysqldump) {
  pushCheck(
    'error',
    'Falta mysqldump. Agrega resources/bin/mysqldump.exe (Windows) o resources/bin/mysqldump (Unix).'
  );
} else {
  pushCheck('ok', 'mysqldump detectado en resources/bin.');
}

if (!hasOauth) {
  pushCheck(
    'warning',
    'No se encontró google-oauth.json en resources/runtime ni en la raíz. La app compilará, pero el backup a Google Drive quedará deshabilitado hasta agregar credenciales.'
  );
} else {
  pushCheck('ok', 'google-oauth.json detectado.');
}

if (!hasMysqldumpLicense) {
  pushCheck(
    'warning',
    'No se encontró resources/bin/LICENSE.mysqldump.txt. Recomendado para trazabilidad de licencia del binario redistribuido.'
  );
} else {
  pushCheck('ok', 'Archivo de licencia de mysqldump detectado.');
}

try {
  require.resolve('@alexssmusica/node-printer');
  pushCheck('ok', '@alexssmusica/node-printer instalado en node_modules.');
} catch {
  pushCheck(
    process.platform === 'win32' ? 'error' : 'warning',
    'No se encontró @alexssmusica/node-printer. En Windows romperá impresión/cajón.'
  );
}

const hasErrors = checks.some((check) => check.status === 'error');
if (hasErrors) {
  process.exit(1);
}

console.log('[runtime:check] OK - validación completada sin errores críticos.');
