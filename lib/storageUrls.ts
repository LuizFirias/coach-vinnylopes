/**
 * Helpers for Supabase Storage URLs.
 *
 * Convention: DB columns store ONLY the file path inside the bucket
 * (ex: "userId/timestamp_file.jpg"), never the full host URL.
 * The host is resolved at display time from the current Supabase project,
 * which makes any future project migration safe.
 *
 * All helpers also accept legacy full URLs (from older data) and rewrite
 * the host to the current project, so existing rows never break.
 */

import { supabaseClient } from './supabaseClient';

const PUBLIC_MARKER = (bucket: string) => `/storage/v1/object/public/${bucket}/`;
const SIGNED_MARKER = (bucket: string) => `/storage/v1/object/sign/${bucket}/`;

/**
 * Extract the path inside the bucket from either a full URL or a raw path.
 * Returns null when input is empty.
 */
export function extractStoragePath(
  bucket: string,
  value: string | null | undefined
): string | null {
  if (!value) return null;
  // Pass through inline data/blob URLs (used for local preview)
  if (value.startsWith('data:') || value.startsWith('blob:')) return null;
  if (!value.startsWith('http')) return value;

  const publicIdx = value.indexOf(PUBLIC_MARKER(bucket));
  if (publicIdx >= 0) {
    return value.substring(publicIdx + PUBLIC_MARKER(bucket).length).split('?')[0];
  }

  const signedIdx = value.indexOf(SIGNED_MARKER(bucket));
  if (signedIdx >= 0) {
    return value.substring(signedIdx + SIGNED_MARKER(bucket).length).split('?')[0];
  }

  // Last resort — generic split
  const generic = value.split(`/${bucket}/`);
  if (generic.length > 1) return generic[generic.length - 1].split('?')[0];

  return value;
}

/**
 * Resolve a public URL for a stored value (path or legacy full URL).
 * Always points to the CURRENT Supabase project.
 */
export function getPublicStorageUrl(
  bucket: string,
  value: string | null | undefined
): string | null {
  if (!value) return null;
  // Inline previews go straight to the <img>
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;
  const path = extractStoragePath(bucket, value);
  if (!path) return null;
  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Resolve a signed URL (private buckets) for a stored value.
 * Returns null if signing fails or path is empty.
 */
export async function getSignedStorageUrl(
  bucket: string,
  value: string | null | undefined,
  expiresInSeconds = 3600
): Promise<string | null> {
  const path = extractStoragePath(bucket, value);
  if (!path) return null;
  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error) {
    console.error(`[storage] erro ao assinar ${bucket}/${path}:`, error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}
