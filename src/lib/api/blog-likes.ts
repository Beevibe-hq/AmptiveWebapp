import { $blogLikes } from './services/blog-likes';

export const getPostLikeStatus = async (userId: string, postId: string): Promise<boolean> => {
  try {
    const response = await $blogLikes.getStatus(userId, postId);
    return response.liked;
  } catch {
    return false;
  }
};

export const togglePostLike = async (userId: string, postId: string, isCurrentlyLiked: boolean): Promise<boolean> => {
  try {
    const response = await $blogLikes.toggle(userId, postId, isCurrentlyLiked);
    return response.liked;
  } catch {
    return false;
  }
};
