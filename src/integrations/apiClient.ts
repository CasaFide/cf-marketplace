export const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8000';

function getToken() {
  try {
    return localStorage.getItem('access_token');
  } catch {
    return null;
  }
}

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  };

  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let data = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const error = (data && data.detail) ? data : { status: res.status, body: data };
    throw error;
  }
  return data;
}

// Request a presigned upload URL from backend
export async function presignUpload(filename: string, contentType: string, folder = '') {
  return apiFetch('/uploads/presign', {
    method: 'POST',
    body: JSON.stringify({ filename, content_type: contentType, folder }),
  });
}

// Upload file to presigned URL (PUT to S3 or similar)
export async function uploadToUrl(url: string, file: File, contentType?: string) {
  const res = await fetch(url, { method: 'PUT', body: file, headers: contentType ? { 'Content-Type': contentType } : {} });
  if (!res.ok) throw new Error('Upload failed');
  return res;
}

export function setAccessToken(token: string | null) {
  try {
    if (token) localStorage.setItem('access_token', token);
    else localStorage.removeItem('access_token');
  } catch {}
}

export function getAccessToken() {
  return getToken();
}

// Matches helpers
export async function listMatches(status?: string | null) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch(`/matches${qs}`);
}

export async function createMatch(payload: any) {
  return apiFetch('/matches', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateMatch(matchId: string, payload: any) {
  return apiFetch(`/matches/${matchId}`, { method: 'PUT', body: JSON.stringify(payload) });
}
