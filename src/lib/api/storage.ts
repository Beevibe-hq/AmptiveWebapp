import { api, API_BASE } from './client';

export async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  return api.uploadFile(bucket, path, file);
}

export function getPublicUrl(bucket: string, path: string): string {
  return `${API_BASE}/storage/${bucket}/${path}`;
}

export async function listFiles(bucket: string): Promise<string[]> {
  try {
    const files = await api.get<string[]>(`/storage/${bucket}`);
    return files || [];
  } catch {
    return [];
  }
}