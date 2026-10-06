#!/usr/bin/env node
/**
 * Loads a specific .env file, then .env.local (highest priority, matching Next.js's own
 * precedence), before running a command. Needed for `staging`: Next.js only auto-loads
 * .env.development / .env.production based on NODE_ENV, so a staging env file has to be
 * loaded explicitly.
 *
 * Usage: node scripts/run-with-env.js .env.staging next build
 */
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { config } = require("dotenv");

const [envFile, command, ...args] = process.argv.slice(2);
if (!envFile || !command) {
  console.error("Usage: run-with-env.js <path-to-env-file> <command> [...args]");
  process.exit(1);
}

config({ path: path.resolve(process.cwd(), envFile) });
// .env.local fills in anything envFile didn't set (e.g. a developer's own secrets) but
// never overrides it — a stray personal .env.local must not silently override staging/prod.
config({ path: path.resolve(process.cwd(), ".env.local"), override: false });

const result = spawnSync(command, args, {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
