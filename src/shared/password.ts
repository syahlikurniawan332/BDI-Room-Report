const DEFAULT_ITERATIONS = 310_000;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface PasswordRecord {
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
}

export async function hashPassword(
  password: string,
  iterations = DEFAULT_ITERATIONS,
): Promise<PasswordRecord> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );
  return {
    passwordHash: toBase64(derived),
    passwordSalt: toBase64(saltBytes.buffer),
    passwordIterations: iterations,
  };
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
  passwordSalt: string,
  passwordIterations: number,
): Promise<boolean> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: fromBase64(passwordSalt),
      iterations: passwordIterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );
  const stored = fromBase64(passwordHash);
  const calculated = new Uint8Array(derived);
  if (stored.length !== calculated.length) return false;
  let diff = 0;
  for (let i = 0; i < stored.length; i += 1) {
    diff |= stored[i] ^ calculated[i];
  }
  return diff === 0;
}

export async function hashSessionToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return toBase64(hash);
}

export function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toBase64(bytes.buffer).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export { DEFAULT_ITERATIONS };
