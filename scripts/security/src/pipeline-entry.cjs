#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const {
  securityFiles,
  readExpectedChecksum,
  computeFileChecksum,
  detectDebugging
} = require('./security-shared.cjs');

const args = process.argv.slice(2);
const modeArg = args.find((arg) => arg.startsWith('--mode=')) ?? '--mode=unknown';

if (detectDebugging()) {
  console.error('[MASTER-KEY] Depuración detectada en pipeline-entry.');
  process.exit(1);
}

const expected = readExpectedChecksum(securityFiles.verifyScriptChecksumPath);
if (!expected) {
  console.error('[MASTER-KEY] No existe checksum de verify-master-key. Ejecuta "npm run masterkey:prepare".');
  process.exit(1);
}

const current = computeFileChecksum(securityFiles.verifyScriptPath);
if (current !== expected) {
  console.error('[MASTER-KEY] Integridad comprometida: verify-master-key fue modificado.');
  process.exit(1);
}

const result = spawnSync(process.execPath, [securityFiles.verifyScriptPath, modeArg], {
  cwd: process.cwd(),
  stdio: 'inherit'
});

process.exit(result.status ?? 1);
