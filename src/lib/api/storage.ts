import { API_BASE } from './client';
import { $storage } from './services';

export async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  return $storage.upload(bucket, path, file);
}

export async function uploadImage(file: File, purpose: 'profile-picture'): Promise<string> {
  const formData = new FormData();
  formData.append('images', file);
  formData.append('purpose', purpose);

  const token = localStorage.getItem('amptive.auth');
  
  const response = await fetch(`${API_BASE}/extras/upload-image`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
  });

  const result = await response.json() as { status: boolean; status_code: number; data?: { urls: string[] }; message?: string };
  
  if (!result.status || !result.data?.urls?.[0]) {
    throw new Error(result.message || 'Upload failed');
  }
  
  return result.data.urls[0];
}

export function getPublicUrl(bucket: string, path: string): string {
  return `${API_BASE}/storage/${bucket}/${path}`;
}

export async function listFiles(bucket: string): Promise<string[]> {
  try {
    const files = await $storage.listFiles(bucket);
    return files || [];
  } catch {
    return [];
  }
}