import { API_BASE } from './client';
import { $storage, ImageUploadPurpose } from './services';

export async function uploadImage(file: File, purpose: ImageUploadPurpose): Promise<string> {
  const response = await $storage.upload([file], purpose);
  
  return response.urls[0];
}

export function getPublicUrl(bucket: string, path: string): string {
  return `${API_BASE}/storage/${bucket}/${path}`;
}
