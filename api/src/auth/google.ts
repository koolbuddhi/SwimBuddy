import { createRemoteJWKSet, jwtVerify } from 'jose';

const GOOGLE_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUER = 'https://accounts.google.com';

export interface GooglePayload {
  sub: string;
  email: string;
  name: string;
}

export async function verifyGoogleToken(
  idToken: string,
  audience: string,
): Promise<GooglePayload> {
  const keySet = createRemoteJWKSet(new URL(GOOGLE_JWKS_URI));
  const { payload } = await jwtVerify(idToken, keySet, {
    issuer: GOOGLE_ISSUER,
    audience,
  });

  const sub = payload.sub as string;
  const email = payload.email as string;
  const name = (payload.name ?? payload.email) as string;

  if (!sub || !email) throw new Error('Missing required fields in Google token');

  return { sub, email, name };
}
