import { api } from '../client';

const BLOG_LIKES_PREFIX = '/blog-likes';

export const $blogLikes = {
  getStatus: (userId: string, postId: string) =>
    api.get<{ liked: boolean }>(
      `${BLOG_LIKES_PREFIX}/status?user_id=${userId}&post_id=${postId}`
    ),

  toggle: (userId: string, postId: string, isCurrentlyLiked: boolean) =>
    api.post<{ liked: boolean }>(`${BLOG_LIKES_PREFIX}/toggle`, {
      user_id: userId,
      post_id: postId,
      is_liked: !isCurrentlyLiked,
    }),
};
