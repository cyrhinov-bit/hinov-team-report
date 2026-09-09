import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { Request } from "express";

const supabaseUrl = (process.env.SUPABASE_URL || "http://127.0.0.1:54321").replace(/\/+$/, "");
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function supabaseRequest(
  path: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
) {
  const url = `${supabaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const effectiveApiKey =
    options.headers?.apikey ||
    options.headers?.apiKey ||
    supabaseAnonKey ||
    supabaseServiceRoleKey;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(effectiveApiKey ? { apikey: effectiveApiKey } : {}),
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers ?? {}),
  };

  if (!headers.Authorization && !headers.authorization && effectiveApiKey) {
    headers.Authorization = `Bearer ${effectiveApiKey}`;
  }

  return fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body,
  });
}

export async function supabaseAdminRequest(
  path: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
) {
  const adminKey = supabaseServiceRoleKey || supabaseAnonKey;
  return supabaseRequest(path, {
    ...options,
    headers: {
      apikey: adminKey,
      Authorization: `Bearer ${adminKey}`,
      ...(options.headers ?? {}),
    },
  });
}

export function getBearerToken(req: Request) {
  const value = req.header("authorization");
  return value?.startsWith("Bearer ") ? value.slice("Bearer ".length) : null;
}

export async function getSupabaseUser(req: Request) {
  const token = getBearerToken(req);
  if (!token) return null;
  const response = await supabaseRequest("/auth/v1/user", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  return (await response.json()) as { id: string; email?: string; user_metadata?: Record<string, unknown> };
}

function getEncryptionKey() {
  const secret = process.env.SESSION_SECRET || process.env.ENCRYPTION_SECRET || "hinov-team-report-default-secret-key-32b";
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Invalid encrypted secret.");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}