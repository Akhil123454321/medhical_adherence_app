// Auth utilities — use Web Crypto API so this works in both
// Edge runtime (middleware) and Node.js runtime (API routes).

const SECRET =
  process.env.AUTH_SECRET || "dev-secret-medadhere-change-in-production";

export interface AuthPayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  /** Unix timestamp (ms) when the token expires */
  exp: number;
}

async function getKey(usage: "sign" | "verify"): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(SECRET);
  return crypto.subtle.importKey(
    "raw",
    keyData.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  );
}

function toBase64(buffer: ArrayBuffer): string {
  let str = "";
  new Uint8Array(buffer).forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
}

/** Creates a signed token: base64(payload).base64(hmac) */
export async function createToken(payload: AuthPayload): Promise<string> {
  const dataB64 = btoa(JSON.stringify(payload));
  const key = await getKey("sign");
  const encoded = new TextEncoder().encode(dataB64);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoded.buffer as ArrayBuffer
  );
  return `${dataB64}.${toBase64(sig)}`;
}

/** Returns the payload if the token is valid and not expired, else null. */
export async function verifyToken(
  token: string
): Promise<AuthPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [dataB64, sigB64] = parts;

  try {
    const key = await getKey("verify");
    const encodedData = new TextEncoder().encode(dataB64);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64(sigB64),
      encodedData.buffer as ArrayBuffer
    );
    if (!valid) return null;

    const payload: AuthPayload = JSON.parse(atob(dataB64));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const AUTH_COOKIE = "auth-token";
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
