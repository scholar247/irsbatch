/**
 * Centralized, validated access to environment variables. Import from here instead of
 * `process.env` directly so a missing var fails loudly at first use, not deep in a request.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  appEnv: optional("APP_ENV", "development") as "development" | "staging" | "production",

  firebase: {
    projectId: () => required("FIREBASE_PROJECT_ID"),
    clientEmail: () => required("FIREBASE_CLIENT_EMAIL"),
    // Private key is stored with literal \n sequences in most env systems; normalize them.
    privateKey: () => required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    storageBucket: () => required("FIREBASE_STORAGE_BUCKET"),
    isConfigured: () =>
      Boolean(
        process.env.FIREBASE_PROJECT_ID &&
          process.env.FIREBASE_CLIENT_EMAIL &&
          process.env.FIREBASE_PRIVATE_KEY &&
          process.env.FIREBASE_STORAGE_BUCKET
      ),
  },

  auth: {
    accessTokenSecret: () => required("JWT_ACCESS_SECRET"),
    refreshTokenSecret: () => required("JWT_REFRESH_SECRET"),
    activationTokenSecret: () => required("JWT_ACTIVATION_SECRET"),
    accessTokenTtlSeconds: () => Number(optional("JWT_ACCESS_TTL_SECONDS", String(15 * 60))),
    refreshTokenTtlSeconds: () =>
      Number(optional("JWT_REFRESH_TTL_SECONDS", String(30 * 24 * 60 * 60))),
    activationTokenTtlSeconds: () =>
      Number(optional("JWT_ACTIVATION_TTL_SECONDS", String(7 * 24 * 60 * 60))),
  },
} as const;

export function isProduction(): boolean {
  return env.appEnv === "production";
}
