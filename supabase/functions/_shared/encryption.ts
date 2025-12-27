/**
 * Token Encryption Utilities for Gmail OAuth Tokens
 * 
 * Uses AES-GCM for encryption with a server-side secret key.
 * The encryption key is stored in Supabase Secrets (GMAIL_TOKEN_ENCRYPTION_KEY).
 */

// Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Convert base64 to Uint8Array
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Convert Uint8Array to base64
function bytesToBase64(bytes: Uint8Array): string {
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}

// Convert Uint8Array to ArrayBuffer (copies data to ensure proper ArrayBuffer type)
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/**
 * Get the encryption key from environment
 * Key should be a 32-byte (256-bit) hex string (64 characters)
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyHex = Deno.env.get('GMAIL_TOKEN_ENCRYPTION_KEY');
  if (!keyHex) {
    throw new Error('GMAIL_TOKEN_ENCRYPTION_KEY is not configured');
  }
  
  // Validate key length (should be 64 hex characters = 32 bytes = 256 bits)
  if (keyHex.length !== 64) {
    throw new Error('GMAIL_TOKEN_ENCRYPTION_KEY must be 64 hex characters (256 bits)');
  }
  
  const keyBytes = hexToBytes(keyHex);
  
  return await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(keyBytes),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random nonce for AES-GCM (12 bytes recommended)
 */
function generateNonce(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

export interface EncryptedToken {
  ciphertext: string;  // base64 encoded
  nonce: string;       // base64 encoded
  keyVersion: number;
}

/**
 * Encrypt a token string using AES-GCM
 */
export async function encryptToken(plaintext: string): Promise<EncryptedToken> {
  const key = await getEncryptionKey();
  const nonce = generateNonce();
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(nonce) },
    key,
    data
  );
  
  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    nonce: bytesToBase64(nonce),
    keyVersion: 1,
  };
}

/**
 * Decrypt a token using AES-GCM
 */
export async function decryptToken(encrypted: EncryptedToken): Promise<string> {
  const key = await getEncryptionKey();
  const nonce = base64ToBytes(encrypted.nonce);
  const ciphertext = base64ToBytes(encrypted.ciphertext);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(nonce) },
    key,
    toArrayBuffer(ciphertext)
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt both access and refresh tokens
 */
export async function encryptGmailTokens(
  accessToken: string,
  refreshToken: string | null
): Promise<{
  accessTokenEnc: string;
  refreshTokenEnc: string | null;
  nonce: string;
  keyVersion: number;
}> {
  const key = await getEncryptionKey();
  const nonce = generateNonce();
  const encoder = new TextEncoder();
  
  // Encrypt access token
  const accessCiphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(nonce) },
    key,
    encoder.encode(accessToken)
  );
  
  let refreshCiphertext: ArrayBuffer | null = null;
  if (refreshToken) {
    // Use a different nonce for refresh token (derived from main nonce)
    const refreshNonce = new Uint8Array(12);
    refreshNonce.set(nonce);
    refreshNonce[11] = (refreshNonce[11] + 1) % 256;
    
    refreshCiphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(refreshNonce) },
      key,
      encoder.encode(refreshToken)
    );
  }
  
  return {
    accessTokenEnc: bytesToBase64(new Uint8Array(accessCiphertext)),
    refreshTokenEnc: refreshCiphertext ? bytesToBase64(new Uint8Array(refreshCiphertext)) : null,
    nonce: bytesToBase64(nonce),
    keyVersion: 1,
  };
}

/**
 * Decrypt Gmail tokens
 */
export async function decryptGmailTokens(
  accessTokenEnc: string,
  refreshTokenEnc: string | null,
  nonceBase64: string
): Promise<{
  accessToken: string;
  refreshToken: string | null;
}> {
  const key = await getEncryptionKey();
  const nonce = base64ToBytes(nonceBase64);
  const decoder = new TextDecoder();
  
  // Decrypt access token
  const accessCiphertext = base64ToBytes(accessTokenEnc);
  const accessDecrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(nonce) },
    key,
    toArrayBuffer(accessCiphertext)
  );
  
  let refreshToken: string | null = null;
  if (refreshTokenEnc) {
    // Use the same derived nonce for refresh token
    const refreshNonce = new Uint8Array(12);
    refreshNonce.set(nonce);
    refreshNonce[11] = (refreshNonce[11] + 1) % 256;
    
    const refreshCiphertext = base64ToBytes(refreshTokenEnc);
    const refreshDecrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(refreshNonce) },
      key,
      toArrayBuffer(refreshCiphertext)
    );
    refreshToken = decoder.decode(refreshDecrypted);
  }
  
  return {
    accessToken: decoder.decode(accessDecrypted),
    refreshToken,
  };
}

/**
 * Check if encryption is configured
 */
export function isEncryptionConfigured(): boolean {
  const keyHex = Deno.env.get('GMAIL_TOKEN_ENCRYPTION_KEY');
  return !!keyHex && keyHex.length === 64;
}

/**
 * Get tokens from gmail_config, preferring encrypted tokens if available
 * Falls back to plaintext tokens for migration compatibility
 */
export async function getGmailTokens(config: {
  access_token: string | null;
  refresh_token: string | null;
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  token_nonce: string | null;
}): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
  wasEncrypted: boolean;
}> {
  // If encrypted tokens are available and encryption is configured, use them
  if (config.access_token_enc && config.token_nonce && isEncryptionConfigured()) {
    try {
      const decrypted = await decryptGmailTokens(
        config.access_token_enc,
        config.refresh_token_enc,
        config.token_nonce
      );
      return {
        accessToken: decrypted.accessToken,
        refreshToken: decrypted.refreshToken,
        wasEncrypted: true,
      };
    } catch (error) {
      console.error('Failed to decrypt tokens, falling back to plaintext:', error);
    }
  }
  
  // Fall back to plaintext tokens
  return {
    accessToken: config.access_token,
    refreshToken: config.refresh_token,
    wasEncrypted: false,
  };
}
