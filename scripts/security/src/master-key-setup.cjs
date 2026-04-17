#!/usr/bin/env node
const {
  securityFiles,
  sha256Hex,
  buildUnlockPassword,
  promptHidden,
  detectDebugging,
  writeEncryptedJson
} = require('./security-shared.cjs');

const run = async () => {
  if (detectDebugging()) {
    throw new Error('Depuración detectada. Operación bloqueada.');
  }

  const first = await promptHidden('[MASTER-KEY] Ingresa la clave maestra: ');
  const second = await promptHidden('[MASTER-KEY] Confirma la clave maestra: ');

  if (!first || String(first).length < 8) {
    throw new Error('La clave maestra debe tener al menos 8 caracteres.');
  }
  if (String(first) !== String(second)) {
    throw new Error('Las claves no coinciden.');
  }

  const payload = {
    version: 1,
    createdAt: new Date().toISOString(),
    masterKeyHash: sha256Hex(String(first))
  };

  writeEncryptedJson(securityFiles.encryptedEnvPath, payload, buildUnlockPassword());
  console.log(`[MASTER-KEY] Archivo cifrado creado en ${securityFiles.encryptedEnvPath}`);
};

run().catch((error) => {
  console.error(
    `[MASTER-KEY] Error en configuración: ${error instanceof Error ? error.message : 'desconocido'}`
  );
  process.exit(1);
});
