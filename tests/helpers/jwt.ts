/**
 * Real, locally signed JWTs for the token-verification tests (RISK-134). No network and no secret
 * from any real project: ES256 tokens are signed with a throw-away key pair generated per run, and
 * the matching JWKS is what a stubbed `/.well-known/jwks.json` answers with. "HS256" tokens only
 * need to look like one (header alg HS256, no `kid`): the library cannot verify those locally and
 * asks the (stubbed) Auth server, which is exactly the path under test.
 */

function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  return Buffer.from(bytes).toString('base64url');
}

export type Claims = Record<string, unknown>;

export function futureExp(seconds = 3600): number {
  return Math.floor(Date.now() / 1000) + seconds;
}

export function validClaims(overrides: Claims = {}): Claims {
  return {
    iss: 'https://example.supabase.co/auth/v1',
    sub: 'user-1',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'staff@example.com',
    phone: '',
    exp: futureExp(),
    iat: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

let hsCounter = 0;

/** A JWT-shaped token the library must send to the Auth server (HS256, no kid). Unique per call. */
export function makeHsToken(claims: Claims = validClaims()): string {
  hsCounter += 1;
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ ...claims, jti: `hs-${hsCounter}` }));
  return `${header}.${payload}.${b64url('not-a-real-signature')}`;
}

export interface Es256Signer {
  kid: string;
  jwks: { keys: Record<string, unknown>[] };
  sign(claims?: Claims): Promise<string>;
}

/** A fresh ES256 key pair, its public JWKS, and a signer producing tokens that verify against it. */
export async function createEs256Signer(kid = 'test-key-1'): Promise<Es256Signer> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const jwks = { keys: [{ ...publicJwk, kid, alg: 'ES256', use: 'sig', key_ops: ['verify'] }] };
  let counter = 0;

  return {
    kid,
    jwks,
    async sign(claims: Claims = validClaims()) {
      counter += 1;
      const header = b64url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid }));
      const payload = b64url(JSON.stringify({ ...claims, jti: `es-${kid}-${counter}` }));
      const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        pair.privateKey,
        new TextEncoder().encode(`${header}.${payload}`),
      );
      return `${header}.${payload}.${b64url(new Uint8Array(signature))}`;
    },
  };
}

/** Any header/payload/signature, for tokens that must be shaped wrongly on purpose. */
export function makeRawToken(header: Record<string, unknown>, claims: Claims, signature: string): string {
  return `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}.${signature}`;
}
