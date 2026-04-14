import { api, StandardResponse } from './client';

export interface Community {
  community_id: string;
  name: string;
  image?: string;
  cover_image?: string;
  member_count?: number;
  is_private?: boolean;
  created_by?: string;
  description?: string | null;
}

export interface CommunityListResponse {
  communities: Community[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function listCommunities(params?: {
  page?: number;
  page_size?: number;
}): Promise<Community[]> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.page_size) query.set('page_size', String(params.page_size));

  const queryString = query.toString();
  const endpoint = queryString ? `/communities/?${queryString}` : '/communities/';
  
  const response = await api.get<CommunityListResponse>(endpoint);
  
  return response?.communities || [];
}

export async function getCommunity(communityId: string): Promise<Community | null> {
  try {
    const response = await api.get<StandardResponse<Community>>(`/communities/${communityId}`);
    return response.data || null;
  } catch {
    return null;
  }
}

export async function getCommunityMembers(communityId: string): Promise<unknown[]> {
  const response = await api.get<StandardResponse<unknown[]>>(`/communities/${communityId}/members`);
  return response?.data || [];
}

export async function joinCommunity(communityId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await api.post<StandardResponse<null>>(`/communities/${communityId}/join`);
    return { ok: response.status, error: response.status ? undefined : response.message };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function leaveCommunity(communityId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await api.post<StandardResponse<null>>(`/communities/${communityId}/leave`);
    return { ok: response.status, error: response.status ? undefined : response.message };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getMyCommunities(): Promise<Community[]> {
  const response = await api.get<StandardResponse<CommunityListResponse>>('/communities/my-communities');
  return response?.data?.communities || [];
}