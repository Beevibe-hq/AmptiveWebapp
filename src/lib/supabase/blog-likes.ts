import { createClient } from './client';

export const getPostLikeStatus = async (userId: string, postId: string) => {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('blog_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId.toString())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
      console.error('Error fetching like status:', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('Unexpected error fetching like status:', err);
    return false;
  }
};

export const togglePostLike = async (userId: string, postId: string, isCurrentlyLiked: boolean) => {
  const supabase = createClient();
  const postIdStr = postId.toString();

  try {
    if (isCurrentlyLiked) {
      // Unlike (Delete)
      const { error } = await supabase
        .from('blog_likes')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postIdStr);
      
      if (error) throw error;
      return true;
    } else {
      // Like (Insert)
      const { error } = await supabase
        .from('blog_likes')
        .insert({ user_id: userId, post_id: postIdStr });
      
      if (error) throw error;
      return true;
    }
  } catch (err) {
    console.error('Error toggling like:', err);
    return false;
  }
};
