import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export const resolveAppPath = (...segments: string[]) => path.join(app.getAppPath(), ...segments);

export const resolvePackagedResourcePath = (...segments: string[]) =>
  path.join(process.resourcesPath, ...segments);

export const resolveProjectPath = (...segments: string[]) => path.join(app.getAppPath(), ...segments);

export const firstExistingPath = (candidates: string[]) =>
  candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
