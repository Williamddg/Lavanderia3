const fs = require('node:fs');
const path = require('node:path');
const { builtinModules } = require('node:module');

const root = process.cwd();
const packageJsonPath = path.join(root, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const scanDirs = [path.join(root, 'src', 'main'), path.join(root, 'src', 'backend')];
const builtins = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`), 'electron']);

const OPTIONAL_BY_DESIGN = new Set([
  '@alexssmusica/node-printer',
  '@supabase/supabase-js'
]);

const NON_CRITICAL_FILES = new Set([
  'src/main/services/backup-service.ts',
  'src/main/services/printer-service.ts',
  'src/main/services/telemetry.ts'
]);

const importRegexes = [
  { type: 'static', regex: /import\s+[^'"`]*?from\s+['"]([^'"]+)['"]/g },
  { type: 'dynamic', regex: /import\(\s*['"]([^'"]+)['"]\s*\)/g },
  { type: 'require', regex: /require\(\s*['"]([^'"]+)['"]\s*\)/g }
];

const toPackageName = (specifier) => {
  if (specifier.startsWith('@')) {
    const [scope, name] = specifier.split('/');
    return `${scope}/${name ?? ''}`;
  }
  return specifier.split('/')[0];
};

const isPackageSpecifier = (specifier) => {
  if (!specifier || specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('node:')) {
    return false;
  }
  return !builtins.has(specifier);
};

const walk = (dir, collector) => {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, collector);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;
    collector.push(fullPath);
  }
};

const files = [];
for (const dir of scanDirs) walk(dir, files);

const rows = [];
for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(root, filePath).replace(/\\/g, '/');

  for (const { type, regex } of importRegexes) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(content))) {
      const specifier = match[1];
      if (!isPackageSpecifier(specifier)) continue;
      rows.push({
        file: relPath,
        specifier,
        packageName: toPackageName(specifier),
        type,
        nonCritical: NON_CRITICAL_FILES.has(relPath)
      });
    }
  }
}

const uniqueSpecifierMap = new Map();
for (const row of rows) {
  const key = `${row.specifier}|${row.type}`;
  if (!uniqueSpecifierMap.has(key)) uniqueSpecifierMap.set(key, row);
}

const dependencies = packageJson.dependencies || {};
const devDependencies = packageJson.devDependencies || {};
const optionalDependencies = packageJson.optionalDependencies || {};

const errors = [];
const warnings = [];

const grouped = [...uniqueSpecifierMap.values()].sort((a, b) => a.specifier.localeCompare(b.specifier));

for (const row of grouped) {
  const inDeps = Object.prototype.hasOwnProperty.call(dependencies, row.packageName);
  const inDev = Object.prototype.hasOwnProperty.call(devDependencies, row.packageName);
  const inOptional = Object.prototype.hasOwnProperty.call(optionalDependencies, row.packageName);

  let resolvable = true;
  let resolvedPath = null;

  try {
    resolvedPath = require.resolve(row.specifier, { paths: [root] });
  } catch {
    resolvable = false;
  }

  const baseInfo = `[runtime:deps] ${row.specifier} (${row.type}) en ${row.file}`;

  if (!inDeps && !inOptional && inDev) {
    errors.push(`${baseInfo} está en devDependencies; debe estar en dependencies/optionalDependencies.`);
  }

  if (!inDeps && !inOptional && !inDev) {
    warnings.push(`${baseInfo} no está declarado en package.json.`);
  }

  if (!resolvable) {
    const isOptional = OPTIONAL_BY_DESIGN.has(row.packageName) || row.nonCritical;
    const bucket = isOptional ? warnings : errors;
    bucket.push(`${baseInfo} no se puede resolver con require.resolve().`);
    continue;
  }

  const isSubpath = row.specifier !== row.packageName;
  if (isSubpath && !resolvedPath.includes('/node_modules/') && !resolvedPath.includes('\\node_modules\\')) {
    warnings.push(`${baseInfo} resolvió fuera de node_modules (${resolvedPath}). Verifica alias/bundling.`);
  }

  if (row.type === 'static' && row.nonCritical && !OPTIONAL_BY_DESIGN.has(row.packageName)) {
    warnings.push(
      `${baseInfo} es import estático en servicio no crítico. Considera lazy-load para no bloquear boot.`
    );
  }
}

if (grouped.length === 0) {
  warnings.push('[runtime:deps] No se detectaron imports npm en src/main ni src/backend.');
}

for (const warning of warnings) console.warn(warning);
for (const error of errors) console.error(error);

if (errors.length > 0) {
  console.error(`[runtime:deps] FALLÓ con ${errors.length} error(es).`);
  process.exit(1);
}

console.log(`[runtime:deps] OK - ${grouped.length} import(s) npm verificados para main/backend.`);
