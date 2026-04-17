const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const readline = require('node:readline');

const projectRoot = path.resolve(__dirname, '../../..');

const securityFiles = {
  encryptedEnvPath: path.join(projectRoot, '.env.masterkey.enc'),
  generatedBuildAuthPath: path.join(
    projectRoot,
    'src',
    'main',
    'generated',
    'master-build-auth.ts'
  ),
  verifyScriptPath: path.join(projectRoot, 'scripts', 'security', 'dist', 'verify-master-key.cjs'),
  verifyScriptChecksumPath: path.join(
    projectRoot,
    'scripts',
    'security',
    'dist',
    'verify-master-key.sha256'
  ),
  encryptedAttemptsPath: path.join(
    projectRoot,
    '.security',
    'master-attempts.enc'
  )
};

const sha256Hex = (input) => crypto.createHash('sha256').update(input).digest('hex');

const timingSafeEqualHex = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(String(a).trim(), 'hex');
  const right = Buffer.from(String(b).trim(), 'hex');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const buildUnlockPassword = () => {
  const xorKey = (17 * 3) - 2;
  const encoded = [124, 34, 24, 27, 121, 4, 109, 28, 50, 120];
  return String.fromCharCode(...encoded.map((value, index) => (value ^ xorKey) + (index % 2)));
};

const buildRuntimeTokenSecret = () => {
  const xorKey = (11 * 2) - 3;
  const encoded = [81, 124, 107, 46, 111, 60, 124, 77, 109, 62, 79, 104, 115, 105, 44, 112, 120];
  return String.fromCharCode(...encoded.map((value, index) => (value ^ xorKey) - (index % 3)));
};

const detectDebugging = () => {
  const argv = process.execArgv.join(' ').toLowerCase();
  const envFlags = String(process.env.NODE_OPTIONS ?? '').toLowerCase();
  const forceDebug = String(process.env.MASTERKEY_DEBUG ?? '').toLowerCase() === '1';
  return (
    forceDebug ||
    argv.includes('--inspect') ||
    argv.includes('--debug') ||
    envFlags.includes('--inspect') ||
    envFlags.includes('--debug')
  );
};

const promptHidden = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const onData = (char) => {
      const normalized = String(char ?? '');
      switch (normalized) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdout.write('\n');
          break;
        default:
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(question + '*'.repeat(rl.line.length));
      }
    };

    process.stdin.on('data', onData);
    rl.question(question, (value) => {
      process.stdin.removeListener('data', onData);
      rl.close();
      resolve(value);
    });
  });

const deriveKey = (secret, salt) =>
  crypto.scryptSync(secret, salt, 32, {
    N: 2 ** 14,
    r: 8,
    p: 1
  });

const encryptJson = (payload, password) => {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(password, salt);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted.toString('hex')
  };
};

const decryptJson = (payload, password) => {
  const salt = Buffer.from(String(payload.salt ?? ''), 'hex');
  const iv = Buffer.from(String(payload.iv ?? ''), 'hex');
  const tag = Buffer.from(String(payload.tag ?? ''), 'hex');
  const encrypted = Buffer.from(String(payload.data ?? ''), 'hex');
  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
};

const readEncryptedJson = (filePath, password) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  return decryptJson(parsed, password);
};

const writeEncryptedJson = (filePath, payload, password) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const encrypted = encryptJson(payload, password);
  fs.writeFileSync(filePath, JSON.stringify(encrypted), 'utf8');
};

const readExpectedChecksum = (checksumFilePath) => {
  if (!fs.existsSync(checksumFilePath)) return null;
  return String(fs.readFileSync(checksumFilePath, 'utf8')).trim().toLowerCase();
};

const computeFileChecksum = (targetPath) => {
  const content = fs.readFileSync(targetPath);
  return crypto.createHash('sha256').update(content).digest('hex');
};

const buildAuthPayloadMac = (token, salt, nonce, generatedAt) => {
  const secret = buildRuntimeTokenSecret();
  return crypto
    .createHmac('sha256', secret)
    .update(`${token}|${salt}|${nonce}|${generatedAt}`)
    .digest('hex');
};

const writeBuildAuthorization = ({ authorized, token = '', salt = '', nonce = '' }) => {
  const generatedAt = new Date().toISOString();
  const signatureSeed = `${authorized ? '1' : '0'}|${generatedAt}|${token}|${salt}|${nonce}`;
  const signature = authorized ? sha256Hex(signatureSeed) : '';
  const mac = authorized ? buildAuthPayloadMac(token, salt, nonce, generatedAt) : '';
  const content = `export const MASTER_BUILD_AUTHORIZED = ${authorized ? 'true' : 'false'};
export const MASTER_BUILD_SIGNATURE = '${signature}';
export const MASTER_BUILD_GENERATED_AT = '${generatedAt}';
export const MASTER_BUILD_TOKEN = '${token}';
export const MASTER_BUILD_SALT = '${salt}';
export const MASTER_BUILD_NONCE = '${nonce}';
export const MASTER_BUILD_MAC = '${mac}';
`;
  fs.mkdirSync(path.dirname(securityFiles.generatedBuildAuthPath), { recursive: true });
  fs.writeFileSync(securityFiles.generatedBuildAuthPath, content, 'utf8');
};

module.exports = {
  projectRoot,
  securityFiles,
  sha256Hex,
  timingSafeEqualHex,
  buildUnlockPassword,
  buildRuntimeTokenSecret,
  detectDebugging,
  promptHidden,
  encryptJson,
  decryptJson,
  readEncryptedJson,
  writeEncryptedJson,
  readExpectedChecksum,
  computeFileChecksum,
  writeBuildAuthorization
};
