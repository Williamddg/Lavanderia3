const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = process.cwd();
const winMysqldump = path.join(root, 'resources', 'bin', 'mysqldump.exe');
const unixMysqldump = path.join(root, 'resources', 'bin', 'mysqldump');
const oauthRuntime = path.join(root, 'resources', 'runtime', 'google-oauth.json');
const oauthRoot = path.join(root, 'google-oauth.json');
const mysqldumpLicense = path.join(root, 'resources', 'bin', 'LICENSE.mysqldump.txt');
const mysqldumpSourceManifest = path.join(root, 'resources', 'bin', 'mysqldump.source.json');

const checks = [];

const hasMysqldump = fs.existsSync(winMysqldump) || fs.existsSync(unixMysqldump);
const resolvedMysqldumpPath = fs.existsSync(winMysqldump) ? winMysqldump : fs.existsSync(unixMysqldump) ? unixMysqldump : null;
const hasOauth = fs.existsSync(oauthRuntime) || fs.existsSync(oauthRoot);
const hasMysqldumpLicense = fs.existsSync(mysqldumpLicense);
const hasMysqldumpManifest = fs.existsSync(mysqldumpSourceManifest);

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
  pushCheck('ok', `mysqldump detectado en resources/bin: ${resolvedMysqldumpPath}`);
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

if (!hasMysqldumpManifest) {
  pushCheck(
    'warning',
    'No se encontró resources/bin/mysqldump.source.json con procedencia/versión/hash del binario.'
  );
} else {
  try {
    const manifest = JSON.parse(fs.readFileSync(mysqldumpSourceManifest, 'utf-8'));
    const hasMandatoryManifestFields =
      typeof manifest.vendor === 'string' &&
      typeof manifest.version === 'string' &&
      typeof manifest.source_url === 'string' &&
      typeof manifest.sha256 === 'string';

    if (!hasMandatoryManifestFields) {
      pushCheck(
        'error',
        'mysqldump.source.json existe pero no tiene los campos obligatorios (vendor, version, source_url, sha256).'
      );
    } else if (resolvedMysqldumpPath) {
      const content = fs.readFileSync(resolvedMysqldumpPath);
      const fileHash = crypto.createHash('sha256').update(content).digest('hex');

      if (fileHash.toLowerCase() !== String(manifest.sha256).toLowerCase()) {
        pushCheck(
          'error',
          `Hash SHA-256 de mysqldump no coincide. Esperado: ${manifest.sha256} / Actual: ${fileHash}`
        );
      } else {
        pushCheck('ok', 'Hash SHA-256 de mysqldump validado con mysqldump.source.json.');
      }
    }
  } catch (error) {
    pushCheck(
      'error',
      `No se pudo leer/parsear mysqldump.source.json: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

const findNodeFileRecursively = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = findNodeFileRecursively(fullPath);
      if (nested) return nested;
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.node')) {
      return fullPath;
    }
  }
  return null;
};

try {
  const printerEntryPath = require.resolve('@alexssmusica/node-printer');
  const printerModuleRoot = path.dirname(printerEntryPath);
  const resolvedNativeBinding = findNodeFileRecursively(printerModuleRoot);

  if (!resolvedNativeBinding) {
    pushCheck(
      process.platform === 'win32' ? 'error' : 'warning',
      '@alexssmusica/node-printer está instalado pero no se encontró ningún .node dentro del paquete.'
    );
  } else {
    pushCheck('ok', `@alexssmusica/node-printer instalado con binding nativo: ${resolvedNativeBinding}`);
  }
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
