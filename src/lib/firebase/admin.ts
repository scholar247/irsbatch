import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { env } from "@/lib/env";

/**
 * Firebase Admin SDK singleton. This app NEVER uses Firebase Auth or client-side Firestore
 * SDKs — every read/write goes through this server-side Admin client, which bypasses
 * Firestore Security Rules entirely (Admin SDK authorizes via the service account's IAM,
 * not security rules). This is why RBAC enforcement in src/lib/rbac/guard.ts is the only
 * authorization boundary that matters — Firestore rules are set to deny-all as defense in
 * depth, not as the real gate.
 *
 * Cached on globalThis rather than a module-level `let`: Next.js dev-mode hot reload
 * re-evaluates this module on file changes, resetting a plain module variable, while the
 * firebase-admin App/Firestore registry underneath it survives the reload. Without this,
 * the next db() call after any HMR reload calls Firestore.settings() on an
 * already-configured instance and throws "Firestore has already been initialized".
 */
declare global {
  // eslint-disable-next-line no-var
  var __irsbFirebaseApp: App | undefined;
  // eslint-disable-next-line no-var
  var __irsbFirestore: Firestore | undefined;
  // eslint-disable-next-line no-var
  var __irsbStorage: Storage | undefined;
}

function getAdminApp(): App {
  if (globalThis.__irsbFirebaseApp) return globalThis.__irsbFirebaseApp;
  const existing = getApps();
  globalThis.__irsbFirebaseApp =
    existing.length > 0
      ? existing[0]
      : initializeApp({
          credential: cert({
            projectId: env.firebase.projectId(),
            clientEmail: env.firebase.clientEmail(),
            privateKey: env.firebase.privateKey(),
          }),
          storageBucket: env.firebase.storageBucket(),
        });
  return globalThis.__irsbFirebaseApp;
}

export function db(): Firestore {
  if (!globalThis.__irsbFirestore) {
    globalThis.__irsbFirestore = getFirestore(getAdminApp());
    globalThis.__irsbFirestore.settings({ ignoreUndefinedProperties: true });
  }
  return globalThis.__irsbFirestore;
}

export function storage(): Storage {
  if (!globalThis.__irsbStorage) {
    globalThis.__irsbStorage = getStorage(getAdminApp());
  }
  return globalThis.__irsbStorage;
}

export { FieldValue, Timestamp, Transaction } from "firebase-admin/firestore";
