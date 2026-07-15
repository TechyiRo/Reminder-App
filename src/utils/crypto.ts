/**
 * Cryptography utilities using Web Crypto API (AES-GCM 256-bit + PBKDF2)
 * Fully offline-first, client-side encryption for Vault credentials.
 */

// Helper to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate a random cryptographic salt (stored on-device)
export function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return arrayBufferToBase64(array.buffer);
}

// Derive a 256-bit AES-GCM key from the PIN and salt
async function deriveKey(pin: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKeyMaterial = enc.encode(pin);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    rawKeyMaterial,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const saltBuffer = base64ToArrayBuffer(salt);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext using PIN and Salt
export async function encryptPassword(plaintext: string, pin: string, salt: string): Promise<{ ciphertext: string; iv: string }> {
  try {
    const key = await deriveKey(pin, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for GCM
    const enc = new TextEncoder();
    const encodedPlaintext = enc.encode(plaintext);

    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encodedPlaintext
    );

    return {
      ciphertext: arrayBufferToBase64(ciphertextBuffer),
      iv: arrayBufferToBase64(iv.buffer)
    };
  } catch (err) {
    console.error('[Crypto] Encryption failed:', err);
    throw new Error('Encryption failed');
  }
}

// Decrypt ciphertext using PIN and Salt
export async function decryptPassword(ciphertext: string, iv: string, pin: string, salt: string): Promise<string> {
  try {
    const key = await deriveKey(pin, salt);
    const ivBuffer = base64ToArrayBuffer(iv);
    const ciphertextBuffer = base64ToArrayBuffer(ciphertext);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(ivBuffer)
      },
      key,
      ciphertextBuffer
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.error('[Crypto] Decryption failed:', err);
    throw new Error('Invalid PIN or decryption key');
  }
}

// Generate salted hash of PIN for verification (never stores plaintext PIN)
export async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const rawKeyMaterial = enc.encode(pin + salt); // simple salted hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', rawKeyMaterial);
  return arrayBufferToBase64(hashBuffer);
}

// Generate a premium random strong password helper
export function generateStrongPassword(length: number = 16, includeSymbols: boolean = true, includeNumbers: boolean = true): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+~`|}{[]:;?><,./-=';

  let allowedChars = uppercase + lowercase;
  if (includeNumbers) allowedChars += numbers;
  if (includeSymbols) allowedChars += symbols;

  let password = '';
  // Ensure at least one of each required type is included first
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  if (includeNumbers) password += numbers[Math.floor(Math.random() * numbers.length)];
  if (includeSymbols) password += symbols[Math.floor(Math.random() * symbols.length)];

  const randomValues = new Uint32Array(length - password.length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < randomValues.length; i++) {
    password += allowedChars[randomValues[i] % allowedChars.length];
  }

  // Shuffle the password characters randomly
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}
