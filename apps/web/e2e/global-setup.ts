import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Start every E2E run from an empty, isolated data file. */
export default async function globalSetup() {
  await rm(resolve(process.cwd(), '.data', 'e2e-todos.json'), { force: true });
}
