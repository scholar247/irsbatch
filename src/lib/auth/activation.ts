import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

/**
 * One-time-use token emailed to an applicant after approval so they can set their own
 * password (PRD §11: "Never send plaintext passwords"). Single-purpose secret so this
 * token can never be replayed as an access or refresh token even if the claim shape matched.
 */
interface ActivationClaims {
  applicationId: string;
  email: string;
  purpose: "ACTIVATE_ACCOUNT";
}

function key() {
  return new TextEncoder().encode(env.auth.activationTokenSecret());
}

export async function signActivationToken(applicationId: string, email: string): Promise<string> {
  return new SignJWT({ applicationId, email, purpose: "ACTIVATE_ACCOUNT" } satisfies ActivationClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${env.auth.activationTokenTtlSeconds()}s`)
    .sign(key());
}

export async function verifyActivationToken(token: string): Promise<ActivationClaims> {
  const { payload } = await jwtVerify(token, key());
  if (payload.purpose !== "ACTIVATE_ACCOUNT") {
    throw new Error("Invalid token purpose");
  }
  return payload as unknown as ActivationClaims;
}
