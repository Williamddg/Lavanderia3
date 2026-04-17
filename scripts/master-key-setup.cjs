#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const readline = require('node:readline');

const projectRoot = path.resolve(__dirname, '..');
const envFile = path.join(projectRoot, '.env.masterkey');

const sha256 = (input) => crypto.createHash('sha256').update(input).digest('hex');

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
  const first = await promptHidden('[MASTER-KEY] Ingresa la clave maestra: ');
  const second = await promptHidden('[MASTER-KEY] Confirma la clave maestra: ');

  if (!first || String(first).length < 6) {
    throw new Error('La clave debe tener al menos 6 caracteres.');
  }
  if (String(first) !== String(second)) {
    throw new Error('Las claves no coinciden.');
  }

  const hash = sha256(String(first));
  const content = `# Archivo local. No subir al repositorio.\nMASTER_KEY_HASH=${hash}\n`;
  fs.writeFileSync(envFile, content, 'utf8');

  console.log(`[MASTER-KEY] Hash guardado en ${envFile}`);
};

run().catch((error) => {
  console.error(
    `[MASTER-KEY] Error: ${error instanceof Error ? error.message : 'desconocido'}`
  );
  process.exit(1);
});
