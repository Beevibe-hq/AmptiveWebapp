import { api } from './client';

export interface BlogPostFromAPI {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image_url: string;
  status: 'draft' | 'published' | 'archived';
  seo_title?: string;
  seo_description?: string;
  created_at: string;
  updated_at: string;
  author_id?: string;
  author?: {
    name?: string;
    full_name?: string;
    display_name?: string;
    avatar_url?: string;
    profile_image_url?: string;
    username?: string;
  };
  tags?: Array<{
    id: string;
    name: string;
  }>;
  likes_count?: number;
  comments_count?: number;
}

export interface BlogListResponse {
  posts: BlogPostFromAPI[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BlogPostPayload {
  title: string;
  content: string;
  excerpt?: string | null;
  featured_image_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
}

export interface BlogComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    name?: string;
    full_name?: string;
    display_name?: string;
    avatar_url?: string;
    profile_image_url?: string;
    username?: string;
  };
  replies?: BlogComment[];
}

const BLOG_PREFIX = '/blog';

function normalizeBlogListResponse(response: unknown): BlogListResponse {
  const data = (response as any)?.data || response;
  const posts = data?.posts || (Array.isArray(data) ? data : []);

  return {
    posts,
    total: data?.total ?? posts.length,
    page: data?.page ?? 1,
    page_size: data?.page_size ?? 10,
    total_pages: data?.total_pages ?? 1,
  };
}

export async function getPublishedPosts(params?: {
  tag_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<BlogListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.tag_id) queryParams.append('tag_id', params.tag_id);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.page_size) queryParams.append('page_size', String(params.page_size));

  const queryStr = queryParams.toString();
  const endpoint = `${BLOG_PREFIX}${queryStr ? `?${queryStr}` : ''}`;
  const response = await api.get<unknown>(endpoint, { skipAuth: true });
  
  return normalizeBlogListResponse(response);
}

export async function getManageablePosts(params?: {
  status?: 'draft' | 'published' | 'archived';
  page?: number;
  page_size?: number;
}): Promise<BlogListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.page_size) queryParams.append('page_size', String(params.page_size));

  const queryStr = queryParams.toString();
  const response = await api.get<unknown>(`${BLOG_PREFIX}/manage/all${queryStr ? `?${queryStr}` : ''}`);
  return normalizeBlogListResponse(response);
}

export async function createBlogPost(payload: BlogPostPayload): Promise<BlogPostFromAPI> {
  const response = await api.post<unknown>(BLOG_PREFIX, payload);
  return ((response as any)?.data || response) as BlogPostFromAPI;
}

export async function updateBlogPost(postId: string, payload: Partial<BlogPostPayload>): Promise<BlogPostFromAPI> {
  const response = await api.put<unknown>(`${BLOG_PREFIX}/manage/${postId}`, payload);
  return ((response as any)?.data || response) as BlogPostFromAPI;
}

export async function publishBlogPost(postId: string): Promise<BlogPostFromAPI> {
  const response = await api.patch<unknown>(`${BLOG_PREFIX}/manage/${postId}/publish`);
  return ((response as any)?.data || response) as BlogPostFromAPI;
}

export async function archiveBlogPost(postId: string): Promise<BlogPostFromAPI> {
  const response = await api.patch<unknown>(`${BLOG_PREFIX}/manage/${postId}/archive`);
  return ((response as any)?.data || response) as BlogPostFromAPI;
}

export async function getPublishedPostBySlug(slug: string): Promise<BlogPostFromAPI | null> {
  try {
    const response = await api.get<unknown>(`${BLOG_PREFIX}/${encodeURIComponent(slug)}`, { skipAuth: true });
    return ((response as any)?.data || response) as BlogPostFromAPI;
  } catch {
    return null;
  }
}

// Fallback when GET /blog/{slug} fails server-side: the list endpoint still works and
// carries everything except the article body.
export async function findPublishedPostBySlugFromList(slug: string): Promise<BlogPostFromAPI | null> {
  try {
    const response = await getPublishedPosts({ page_size: 100 });
    return response.posts.find(post => post.slug === slug) || null;
  } catch {
    return null;
  }
}

export async function getPostComments(
  postId: string,
  params?: { page?: number; page_size?: number }
): Promise<{ comments: BlogComment[]; total: number }> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.page_size) queryParams.append('page_size', String(params.page_size));

    const queryStr = queryParams.toString();
    const endpoint = `${BLOG_PREFIX}/${postId}/comments${queryStr ? `?${queryStr}` : ''}`;
    const response = await api.get<unknown>(endpoint, { skipAuth: true });
    const data = (response as any)?.data || response;
    const comments = data?.comments || (Array.isArray(data) ? data : []);
    
    return {
      comments,
      total: data?.total ?? comments.length,
    };
  } catch {
    return { comments: [], total: 0 };
  }
}

export async function createPostComment(
  postId: string,
  content: string,
  parentId?: string
): Promise<BlogComment> {
  const payload: Record<string, any> = { content };
  if (parentId) payload.parent_id = parentId;
  const response = await api.post<unknown>(`${BLOG_PREFIX}/${postId}/comments`, payload);
  return ((response as any)?.data || response) as BlogComment;
}
