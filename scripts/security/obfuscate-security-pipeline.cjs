#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const JavaScriptObfuscator = require('javascript-obfuscator');

const root = path.resolve(__dirname, '../..');
const srcDir = path.join(root, 'scripts', 'security', 'src');
const distDir = path.join(root, 'scripts', 'security', 'dist');

const files = [
  { in: 'security-shared.cjs', out: 'security-shared.cjs' },
  { in: 'verify-master-key.cjs', out: 'verify-master-key.cjs' },
  { in: 'pipeline-entry.cjs', out: 'pipeline-entry.cjs' },
  { in: 'electron-before-build.cjs', out: 'electron-before-build.cjs' },
  { in: 'master-key-setup.cjs', out: 'master-key-setup.cjs' }
];

const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 1,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 1,
  debugProtection: true,
  debugProtectionInterval: 2500,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 4,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64', 'rc4'],
  stringArrayIndexShift: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 5,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 6,
  stringArrayWrappersType: 'function',
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

fs.mkdirSync(distDir, { recursive: true });

for (const file of files) {
  const srcPath = path.join(srcDir, file.in);
  const dstPath = path.join(distDir, file.out);
  const source = fs.readFileSync(srcPath, 'utf8');
  const obfuscated = JavaScriptObfuscator.obfuscate(source, obfuscationOptions).getObfuscatedCode();
  fs.writeFileSync(dstPath, obfuscated, 'utf8');
}

const verifyPath = path.join(distDir, 'verify-master-key.cjs');
const verifyHash = crypto
  .createHash('sha256')
  .update(fs.readFileSync(verifyPath))
  .digest('hex');
fs.writeFileSync(path.join(distDir, 'verify-master-key.sha256'), verifyHash, 'utf8');

console.log('[MASTER-KEY] Pipeline de seguridad ofuscado y checksum actualizado.');
