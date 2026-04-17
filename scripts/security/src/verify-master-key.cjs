#!/usr/bin/env node
const crypto = require('node:crypto');
const fs = require('node:fs');
const {
  securityFiles,
  sha256Hex,
  timingSafeEqualHex,
  buildUnlockPassword,
  detectDebugging,
  promptHidden,
  readEncryptedJson,
  writeEncryptedJson,
  writeBuildAuthorization
} = require('./security-shared.cjs');

const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'unknown';

const MAX_FAILURES = 3;
const LOCK_MINUTES = 15;

const randomHex = (bytes) => crypto.randomBytes(bytes).toString('hex');

const readAttemptsLog = () => {
  const unlock = buildUnlockPassword();
  if (!fs.existsSync(securityFiles.encryptedAttemptsPath)) {
    return { failures: [], lockUntil: 0 };
  }
  try {
    const data = readEncryptedJson(securityFiles.encryptedAttemptsPath, unlock);
    return {
      failures: Array.isArray(data.failures) ? data.failures : [],
      lockUntil: Number(data.lockUntil ?? 0)
    };
  } catch {
    return { failures: [], lockUntil: 0 };
  }
};

const writeAttemptsLog = (state) => {
  writeEncryptedJson(securityFiles.encryptedAttemptsPath, state, buildUnlockPassword());
};

const failAndExit = (message) => {
  writeBuildAuthorization({ authorized: false });
  console.error(`[MASTER-KEY] ${message}`);
  process.exit(1);
};

const run = async () => {
  if (detectDebugging()) {
    failAndExit('Depuración detectada. Proceso bloqueado.');
  }

  if (!fs.existsSync(securityFiles.encryptedEnvPath)) {
    failAndExit(
      'No existe .env.masterkey.enc. Ejecuta "npm run masterkey:setup" para inicializar.'
    );
  }

  const attempts = readAttemptsLog();
  const now = Date.now();
  if (attempts.lockUntil && now < attempts.lockUntil) {
    const waitSeconds = Math.ceil((attempts.lockUntil - now) / 1000);
    failAndExit(`Bloqueado temporalmente por seguridad. Reintenta en ${waitSeconds}s.`);
  }

  const stored = readEncryptedJson(securityFiles.encryptedEnvPath, buildUnlockPassword());
  const expectedHash = String(stored.masterKeyHash ?? '').trim().toLowerCase();
  if (!expectedHash || expectedHash.length !== 64) {
    failAndExit('El hash de clave maestra cifrado no es válido.');
  }

  const entered = await promptHidden(`[MASTER-KEY] Ingresa la clave maestra para "${mode}": `);
  const enteredHash = sha256Hex(String(entered ?? ''));
  const valid = timingSafeEqualHex(enteredHash, expectedHash);

  if (!valid) {
    const recentFailures = (attempts.failures ?? []).filter(
      (ts) => Number.isFinite(ts) && now - Number(ts) < 24 * 60 * 60 * 1000
    );
    recentFailures.push(now);
    const failureCount = recentFailures.length;
    const nextState = {
      failures: recentFailures,
      lockUntil: failureCount >= MAX_FAILURES ? now + LOCK_MINUTES * 60 * 1000 : 0
    };
    writeAttemptsLog(nextState);
    failAndExit(
      failureCount >= MAX_FAILURES
        ? `Clave inválida. Se aplicó bloqueo temporal por ${LOCK_MINUTES} minutos.`
        : `Clave inválida. Intento ${failureCount}/${MAX_FAILURES}.`
    );
  }

  writeAttemptsLog({ failures: [], lockUntil: 0 });

  const salt = randomHex(16);
  const nonce = randomHex(16);
  const token = sha256Hex(`${expectedHash}|${salt}|${nonce}|${mode}|${Date.now()}`);
  writeBuildAuthorization({
    authorized: true,
    token,
    salt,
    nonce
  });

  console.log('[MASTER-KEY] Validación exitosa.');
};

run().catch((error) => {
  failAndExit(
    `Error en validación: ${error instanceof Error ? error.message : 'desconocido'}`
  );
});
