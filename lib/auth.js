import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'bombino-crm-jwt-secret-2024-internal'
);

export const COOKIE_NAME = 'bombino_session';
export const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

/**
 * Sign a JWT with the given payload.
 * @param {object} payload  – { id, username, role }
 * @returns {Promise<string>} signed JWT string
 */
export async function signSession(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET);
}

/**
 * Verify + decode the JWT stored in the request cookies.
 * Returns the payload object on success, or null on failure/missing.
 * @returns {Promise<object|null>}
 */
export async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });
    return payload; // { id, username, role, iat, exp }
  } catch {
    return null;
  }
}

/**
 * Verify a raw JWT string (used in middleware where cookies() isn't available).
 * @param {string} token
 * @returns {Promise<object|null>}
 */
export async function verifyToken(token) {
  try {
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch {
    return null;
  }
}

export { JWT_SECRET };
