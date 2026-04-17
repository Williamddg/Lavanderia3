#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const readline = require('node:readline');

const projectRoot = path.resolve(__dirname, '..');
const envFiles = ['.env.masterkey', '.env.local', '.env'].map((f) =>
  path.join(projectRoot, f)
);
const buildAuthFile = path.join(
  projectRoot,
  'src',
  'main',
  'generated',
  'master-build-auth.ts'
);

const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'unknown';

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

const sha256 = (input) => crypto.createHash('sha256').update(input).digest('hex');

const timingSafeEqualHex = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
};

const writeBuildAuth = (authorized, hash = '') => {
  const generatedAt = new Date().toISOString();
  const signature = authorized
    ? sha256(`${hash}|${generatedAt}|lavanderia-master-build`)
    : '';

  const content = `export const MASTER_BUILD_AUTHORIZED = ${authorized ? 'true' : 'false'};
export const MASTER_BUILD_SIGNATURE = '${signature}';
export const MASTER_BUILD_GENERATED_AT = '${generatedAt}';
`;
  fs.mkdirSync(path.dirname(buildAuthFile), { recursive: true });
  fs.writeFileSync(buildAuthFile, content, 'utf8');
};

const promptHidden = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const onDataHandler = (char) => {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdout.write('\n');
          break;
        default:
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(question + '*'.repeat(rl.line.length));
          break;
      }
    };

    process.stdin.on('data', onDataHandler);
    rl.question(question, (value) => {
      process.stdin.removeListener('data', onDataHandler);
      rl.close();
      resolve(value);
    });
  });

const run = async () => {
  envFiles.forEach(loadEnvFile);

  const expectedHash = String(process.env.MASTER_KEY_HASH ?? '').trim().toLowerCase();
  if (!expectedHash) {
    writeBuildAuth(false);
    console.error(
      '[MASTER-KEY] Falta MASTER_KEY_HASH. Configura .env.masterkey local antes de ejecutar.'
    );
    process.exit(1);
  }

  const entered = await promptHidden(
    `[MASTER-KEY] Ingresa la clave maestra para "${mode}": `
  );

  const enteredHash = sha256(String(entered ?? ''));
  const isValid = timingSafeEqualHex(enteredHash, expectedHash);

  if (!isValid) {
    writeBuildAuth(false);
    console.error('[MASTER-KEY] Clave maestra inválida. Proceso bloqueado.');
    process.exit(1);
  }

  writeBuildAuth(true, expectedHash);
  console.log('[MASTER-KEY] Validación exitosa.');
};

run().catch((error) => {
  writeBuildAuth(false);
  console.error(
    `[MASTER-KEY] Error en validación: ${error instanceof Error ? error.message : 'desconocido'}`
  );
  process.exit(1);
});
