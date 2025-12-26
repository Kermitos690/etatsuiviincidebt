// Google API utilities for Gmail and Sheets
import { log, withRetry } from "./core.ts";

// ============= Types =============
export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  sender: string;
  recipient?: string;
  body: string;
  receivedAt: Date;
  labels: string[];
  isSent: boolean;
  emailType: string;
}

export interface GmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

// ============= Configuration =============
const GOOGLE_CLIENT_ID = () => Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = () => Deno.env.get("GOOGLE_CLIENT_SECRET");

// ============= Token Management =============
export async function refreshGoogleToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number } | null> {
  const clientId = GOOGLE_CLIENT_ID();
  const clientSecret = GOOGLE_CLIENT_SECRET();
  
  if (!clientId || !clientSecret) {
    log("error", "Missing Google OAuth credentials");
    return null;
  }
  
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      log("error", "Token refresh failed", { error });
      return null;
    }
    
    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    log("error", "Token refresh error", { error: (error as Error).message });
    return null;
  }
}

// ============= Gmail API =============
export async function fetchGmailMessages(
  accessToken: string,
  options: { 
    query?: string; 
    maxResults?: number; 
    labels?: string[];
    pageToken?: string;
  } = {}
): Promise<{ messages: { id: string; threadId: string }[]; nextPageToken?: string }> {
  const { query, maxResults = 100, labels, pageToken } = options;
  
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (maxResults) params.set("maxResults", maxResults.toString());
  if (labels?.length) params.set("labelIds", labels.join(","));
  if (pageToken) params.set("pageToken", pageToken);
  
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.status}`);
  }
  
  const data = await response.json();
  return {
    messages: data.messages || [],
    nextPageToken: data.nextPageToken,
  };
}

export async function fetchGmailMessage(
  accessToken: string,
  messageId: string
): Promise<any> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.status}`);
  }
  
  return response.json();
}

export function parseGmailMessage(msgData: any, userEmail: string): GmailMessage {
  const headers = msgData.payload?.headers || [];
  const getHeader = (name: string) => 
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
  
  const subject = getHeader("Subject");
  const sender = getHeader("From");
  const recipient = getHeader("To");
  const date = getHeader("Date");
  const labels = msgData.labelIds || [];
  
  // Determine email type
  const senderEmail = extractEmailAddress(sender);
  const isSent = labels.includes("SENT") || senderEmail === userEmail.toLowerCase();
  const subjectLower = subject.toLowerCase();
  
  let emailType = "received";
  if (isSent) {
    if (subjectLower.startsWith("re:") || subjectLower.startsWith("rép:")) {
      emailType = "replied";
    } else if (subjectLower.startsWith("fwd:") || subjectLower.startsWith("tr:") || subjectLower.startsWith("fw:")) {
      emailType = "forwarded";
    } else {
      emailType = "sent";
    }
  }
  
  // Extract body
  const body = extractGmailBody(msgData.payload);
  
  return {
    id: msgData.id,
    threadId: msgData.threadId,
    subject,
    sender,
    recipient,
    body,
    receivedAt: parseDate(date),
    labels,
    isSent,
    emailType,
  };
}

export function extractGmailBody(payload: any): string {
  if (payload?.body?.data) {
    return decodeBase64(payload.body.data);
  }
  
  if (payload?.parts) {
    // Try text/plain first
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64(part.body.data);
      }
      if (part.parts) {
        const nested = extractGmailBody(part);
        if (nested) return nested;
      }
    }
    
    // Fallback to text/html
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const html = decodeBase64(part.body.data);
        return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      }
      if (part.parts) {
        const nested = extractGmailBody(part);
        if (nested) return nested;
      }
    }
  }
  
  return "";
}

export function findGmailAttachments(parts: any[]): GmailAttachment[] {
  const attachments: GmailAttachment[] = [];
  
  for (const part of parts) {
    if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size || 0,
      });
    }
    if (part.parts) {
      attachments.push(...findGmailAttachments(part.parts));
    }
  }
  
  return attachments;
}

export async function downloadGmailAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<Uint8Array | null> {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const base64Data = data.data.replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  } catch (error) {
    log("error", "Failed to download attachment", { error: (error as Error).message });
    return null;
  }
}

// ============= Google Sheets API =============
export async function appendToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: string[][]
): Promise<boolean> {
  const range = `${sheetName}!A:Z`;
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    }
  );
  
  return response.ok;
}

export async function getSheetData(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<string[][] | null> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  if (!response.ok) return null;
  
  const data = await response.json();
  return data.values || [];
}

// ============= Helpers =============
function decodeBase64(data: string): string {
  try {
    return atob(data.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    return "";
  }
}

function extractEmailAddress(fullAddress: string): string {
  const match = fullAddress.match(/<([^>]+)>/);
  return (match ? match[1] : fullAddress).toLowerCase();
}

function parseDate(dateStr: string): Date {
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date() : date;
  } catch {
    return new Date();
  }
}
