import { $communities } from './services';

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
  const query: Record<string, string> = {};
  if (params?.page) query.page = String(params.page);
  if (params?.page_size) query.page_size = String(params.page_size);

  const response = await $communities.list(query);
  return (response?.communities || []) as Community[];
}

export async function getCommunity(communityId: string): Promise<Community | null> {
  try {
    const response = await $communities.getById(communityId) as Community;
    return response || null;
  } catch {
    try {
      const communities = await listCommunities({ page_size: 100 });
      return communities.find((community) => String(community.community_id) === String(communityId)) || null;
    } catch {
      return null;
    }
  }
}

export async function getCommunityMembers(communityId: string): Promise<unknown[]> {
  const response = await $communities.getMembers(communityId);
  return response as unknown[] || [];
}

export async function joinCommunity(communityId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await $communities.join(communityId);
    return { ok: true, error: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function leaveCommunity(communityId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await $communities.leave(communityId);
    return { ok: true, error: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getMyCommunities(): Promise<Community[]> {
  const response = await $communities.getMyCommunities();
  return (response as { communities?: Community[] })?.communities || [];
}
