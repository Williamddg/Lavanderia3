import path from 'node:path';

const safeRequire = <T>(moduleId: string): T | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(moduleId) as T;
  } catch {
    return null;
  }
};

const buildCandidates = (entryModule: string, moduleSuffix: string) => {
  const resources = String((process as NodeJS.Process & { resourcesPath?: string }).resourcesPath ?? '');
  const candidates = [
    entryModule,
    path.join(resources, 'app.asar.unpacked', 'node_modules', 'mysql2', moduleSuffix),
    path.join(resources, 'node_modules', 'mysql2', moduleSuffix),
    path.join(resources, 'app', 'node_modules', 'mysql2', moduleSuffix)
  ];

  return [...new Set(candidates.filter(Boolean))];
};

const loadFromCandidates = <T>(entryModule: string, moduleSuffix: string): T => {
  const candidates = buildCandidates(entryModule, moduleSuffix);

  for (const candidate of candidates) {
    const loaded = safeRequire<T>(candidate);
    if (loaded) return loaded;
  }

  throw new Error(
    `[MYSQL-LOADER] No se pudo cargar mysql2/${moduleSuffix}. Intentos: ${candidates.join(' | ')}`
  );
};

export const loadMysqlPromiseRuntime = () =>
  loadFromCandidates<typeof import('mysql2/promise')>('mysql2/promise', 'promise');

export const loadMysqlRuntime = () =>
  loadFromCandidates<typeof import('mysql2')>('mysql2', 'index');
