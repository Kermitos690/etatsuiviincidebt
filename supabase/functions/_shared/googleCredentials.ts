/**
 * Google OAuth Credentials Sanitization & Validation
 * 
 * This module provides utilities to parse and validate GOOGLE_CLIENT_ID and 
 * GOOGLE_CLIENT_SECRET secrets, handling common copy-paste errors like:
 * - Pasting the entire JSON credentials file instead of just the value
 * - Extra quotes around the value
 * - Whitespace or newlines
 */

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
}

export interface CredentialValidation {
  isValid: boolean;
  hint: "ok" | "looks_like_json" | "has_quotes" | "wrong_format" | "empty";
  message?: string;
}

/**
 * Sanitize a Google credential secret value.
 * Handles:
 * - trim() whitespace
 * - Removes surrounding quotes ("..." or '...')
 * - If value looks like JSON, attempts to extract client_id/client_secret from:
 *   - Top-level { client_id, client_secret }
 *   - { web: { client_id, client_secret } } (Google Cloud Console download format)
 *   - { installed: { client_id, client_secret } } (Desktop app format)
 */
export function sanitizeGoogleCredential(
  rawValue: string | undefined | null,
  fieldName: "client_id" | "client_secret"
): string {
  if (!rawValue) return "";

  let value = rawValue.trim();

  // Remove surrounding quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }

  // Check if it looks like JSON (starts with { or [)
  if (value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value);
      
      // Direct field
      if (parsed[fieldName]) {
        return String(parsed[fieldName]).trim();
      }
      
      // Web application format (most common from Google Cloud Console)
      if (parsed.web && parsed.web[fieldName]) {
        return String(parsed.web[fieldName]).trim();
      }
      
      // Installed application format
      if (parsed.installed && parsed.installed[fieldName]) {
        return String(parsed.installed[fieldName]).trim();
      }
      
      // Fallback: if we parsed JSON but couldn't find the field, return empty
      // This prevents using corrupt data
      console.warn(`Parsed JSON but couldn't find ${fieldName} in structure`);
      return "";
    } catch (e) {
      // Not valid JSON, just use the raw value (might be truncated JSON = error)
      console.warn(`Value looks like JSON but failed to parse: ${(e as Error).message}`);
      // Return empty to force error rather than use broken value
      return "";
    }
  }

  return value;
}

/**
 * Validate that a client_id looks correct.
 * Google OAuth client IDs typically end with ".apps.googleusercontent.com"
 */
export function validateClientId(clientId: string): CredentialValidation {
  if (!clientId || clientId.length === 0) {
    return { isValid: false, hint: "empty", message: "Client ID est vide" };
  }

  // Check for JSON-like content (common mistake)
  if (clientId.includes("{") || clientId.includes('"project_id"')) {
    return { 
      isValid: false, 
      hint: "looks_like_json", 
      message: "Client ID contient du JSON. Copiez uniquement la valeur, pas tout le fichier." 
    };
  }

  // Check for extra quotes
  if (clientId.startsWith('"') || clientId.endsWith('"')) {
    return { 
      isValid: false, 
      hint: "has_quotes", 
      message: "Client ID contient des guillemets. Retirez-les." 
    };
  }

  // Validate format: should end with .apps.googleusercontent.com
  if (!clientId.endsWith(".apps.googleusercontent.com")) {
    return { 
      isValid: false, 
      hint: "wrong_format", 
      message: "Client ID invalide (doit finir par .apps.googleusercontent.com)" 
    };
  }

  // Basic length check (Google client IDs are typically 70+ chars)
  if (clientId.length < 50) {
    return { 
      isValid: false, 
      hint: "wrong_format", 
      message: "Client ID trop court" 
    };
  }

  return { isValid: true, hint: "ok" };
}

/**
 * Validate that a client_secret looks correct.
 * Google OAuth client secrets are typically 24-40 characters, alphanumeric with dashes.
 */
export function validateClientSecret(clientSecret: string): CredentialValidation {
  if (!clientSecret || clientSecret.length === 0) {
    return { isValid: false, hint: "empty", message: "Client Secret est vide" };
  }

  // Check for JSON-like content
  if (clientSecret.includes("{") || clientSecret.includes('"project_id"')) {
    return { 
      isValid: false, 
      hint: "looks_like_json", 
      message: "Client Secret contient du JSON. Copiez uniquement la valeur." 
    };
  }

  // Check for extra quotes
  if (clientSecret.startsWith('"') || clientSecret.endsWith('"')) {
    return { 
      isValid: false, 
      hint: "has_quotes", 
      message: "Client Secret contient des guillemets. Retirez-les." 
    };
  }

  // Basic length check
  if (clientSecret.length < 10) {
    return { 
      isValid: false, 
      hint: "wrong_format", 
      message: "Client Secret trop court" 
    };
  }

  return { isValid: true, hint: "ok" };
}

/**
 * Get sanitized and validated Google credentials from environment.
 * Returns null if credentials are invalid, with error details.
 */
export function getGoogleCredentials(): { 
  credentials: GoogleCredentials | null; 
  error?: string;
  clientIdValidation: CredentialValidation;
  clientSecretValidation: CredentialValidation;
} {
  const rawClientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const rawClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  const clientId = sanitizeGoogleCredential(rawClientId, "client_id");
  const clientSecret = sanitizeGoogleCredential(rawClientSecret, "client_secret");

  const clientIdValidation = validateClientId(clientId);
  const clientSecretValidation = validateClientSecret(clientSecret);

  if (!clientIdValidation.isValid || !clientSecretValidation.isValid) {
    const errors: string[] = [];
    if (!clientIdValidation.isValid) {
      errors.push(`Client ID: ${clientIdValidation.message}`);
    }
    if (!clientSecretValidation.isValid) {
      errors.push(`Client Secret: ${clientSecretValidation.message}`);
    }
    return {
      credentials: null,
      error: errors.join("; "),
      clientIdValidation,
      clientSecretValidation,
    };
  }

  return {
    credentials: { clientId, clientSecret },
    clientIdValidation,
    clientSecretValidation,
  };
}
