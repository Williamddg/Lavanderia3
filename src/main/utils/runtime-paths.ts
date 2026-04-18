import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

const safeGetAppRoot = () => {
  if (app.isPackaged) {
    return process.resourcesPath;
  }

  return process.cwd();
};

export const resolveRuntimePath = (...segments: string[]) =>
  path.join(safeGetAppRoot(), ...segments);

export const resolvePackagedResourcePath = (...segments: string[]) =>
  path.join(process.resourcesPath, ...segments);

export const resolveDevPath = (...segments: string[]) => path.join(process.cwd(), ...segments);

export const firstExistingPath = (candidates: string[]) =>
  candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
