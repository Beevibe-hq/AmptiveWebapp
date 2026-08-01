import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Share2, Heart, Hash, MessageSquare, ArrowLeft, Clock } from 'lucide-react';
import { AmptiveSplash } from '@/components/AmptiveSpinner';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { blogPosts as staticBlogPosts, BlogPost } from '@/lib/blog-data';
import { useAuth } from '@/contexts/AuthContext';
import { getPostLikeStatus, togglePostLike } from '@/lib/api/blog-likes';
import { getPublishedPostBySlug, findPublishedPostBySlugFromList, getPostComments, createPostComment, BlogComment, BlogPostFromAPI } from '@/lib/api/blog';
import { format, parseISO } from 'date-fns';
import { useSEO } from '@/hooks/useSEO';

const LikeButton = ({ isLiked, onToggle, isLiking }: { isLiked: boolean; onToggle: () => void; isLiking: boolean }) => {
  return (
    <button 
      onClick={onToggle}
      disabled={isLiking}
      className={`relative inline-flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium transition-all active:scale-90 ${
        isLiked 
        ? 'bg-red-50 border-red-200 text-red-600' 
        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
      } ${isLiking ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {/* Particles effect */}
      <AnimatePresence mode="popLayout">
        {isLiked && !isLiking && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                animate={{ 
                  scale: [0, 1, 0.5, 0], 
                  x: Math.cos((i * 45) * (Math.PI / 180)) * 40,
                  y: Math.sin((i * 45) * (Math.PI / 180)) * 40,
                  opacity: [1, 1, 1, 0]
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-red-500"
                style={{ marginLeft: "-3px", marginTop: "-3px" }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <motion.div
        animate={isLiked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
        transition={{ duration: 0.45, ease: "backOut" }}
      >
        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
      </motion.div>
      <span>{isLiked ? 'Liked' : 'Like Post'}</span>
    </button>
  );
};

interface CommentNodeProps {
  comment: BlogComment;
  onReply: (parentId: string, text: string) => Promise<void>;
  replyingToId: string | null;
  setReplyingToId: (id: string | null) => void;
}

const CommentNode: React.FC<CommentNodeProps> = ({ comment, onReply, replyingToId, setReplyingToId }) => {
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    try {
      await onReply(comment.id, replyText);
      setReplyText('');
      setReplyingToId(null);
    } catch (e) {
      toast.error('Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const authorName = comment.author?.display_name || comment.author?.full_name || comment.author?.name || comment.author?.username || 'Anonymous';
  const authorInitials = authorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex gap-4 mt-6">
      <div className="flex-none w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
        {(comment.author?.profile_image_url || comment.author?.avatar_url) ? (
          <img src={comment.author.profile_image_url || comment.author.avatar_url} alt={authorName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-semibold text-gray-500">{authorInitials || 'A'}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-sm text-gray-900">{authorName}</span>
            <span className="text-xs text-gray-400">
              {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : 'Just now'}
            </span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
        </div>
        
        <div className="flex items-center gap-4 mt-2 ml-2">
          <button 
            onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
            className="text-xs font-bold text-gray-500 hover:text-black transition-colors"
          >
            {replyingToId === comment.id ? 'Cancel' : 'Reply'}
          </button>
        </div>

        {replyingToId === comment.id && (
          <form onSubmit={handleSubmitReply} className="mt-3 flex gap-3">
            <input 
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${authorName}...`}
              className="flex-1 py-2 px-4 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-blue-500"
              disabled={isSubmitting}
            />
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-black text-white text-xs font-bold rounded-full hover:bg-gray-800 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="border-l border-gray-100 pl-4 mt-2">
            {comment.replies.map(reply => (
              <CommentNode 
                key={reply.id} 
                comment={reply} 
                onReply={onReply}
                replyingToId={replyingToId}
                setReplyingToId={setReplyingToId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function mapAPIPostToBlogPost(apiPost: BlogPostFromAPI): BlogPost & { slug?: string } {
  const category = apiPost.tags?.[0]?.name || 'General';
  
  const categoryColors: Record<string, string> = {
    'Events': '#22c55e',
    'Insights': '#f59e0b',
    'Amptive': '#3b82f6',
    'Product': '#8b5cf6',
    'Community': '#ec4899',
    'General': '#64748b'
  };

  let formattedDate = 'Recent';
  try {
    if (apiPost.created_at) {
      formattedDate = format(parseISO(apiPost.created_at), 'MMM dd, yyyy');
    }
  } catch (e) {
    console.error('Date parsing error:', e);
  }

  return {
    id: apiPost.id,
    slug: apiPost.slug,
    title: apiPost.title,
    category,
    image: apiPost.featured_image_url || '/images/Overview.png',
    date: formattedDate,
    featured: false,
    color: categoryColors[category] || '#3b82f6',
    content: apiPost.content,
    authors: apiPost.author ? [{
      name: apiPost.author.display_name || apiPost.author.full_name || apiPost.author.name || apiPost.author.username || 'Amptive Team',
      role: 'Author',
      image: apiPost.author.profile_image_url || apiPost.author.avatar_url || undefined,
      initials: (apiPost.author.display_name || apiPost.author.full_name || apiPost.author.name || apiPost.author.username || 'AT')
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }] : [{ name: 'Amptive Team', initials: 'AT' }]
  };
}

const BlogPostDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  
  const [post, setPost] = useState<(BlogPost & { slug?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentUnavailable, setContentUnavailable] = useState(false);
  const [fallbackExcerpt, setFallbackExcerpt] = useState('');
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [likeLoading, setLikeLoading] = useState(true);

  useSEO({
    title: post ? post.title : 'Loading Post...',
    description: post ? (post.content?.slice(0, 155) || 'Read this post on Amptive.') : 'Read the latest stories and posts on Amptive.',
    image: post?.image,
    type: 'article',
  });

  useEffect(() => {
    const fetchPostData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const apiPost = await getPublishedPostBySlug(id);
        if (apiPost) {
          setPost(mapAPIPostToBlogPost(apiPost));
        } else {
          // The detail endpoint may be failing server-side — the post can still be
          // found in the list, minus its body.
          const listPost = await findPublishedPostBySlugFromList(id);
          if (listPost) {
            setPost({ ...mapAPIPostToBlogPost(listPost), content: '' });
            setFallbackExcerpt(listPost.excerpt || '');
            setContentUnavailable(true);
          } else {
            // Check static posts fallback
            const staticPost = staticBlogPosts.find(p => p.id.toString() === id);
            setPost(staticPost || null);
          }
        }
      } catch (err) {
        console.error('Error fetching blog post:', err);
        const staticPost = staticBlogPosts.find(p => p.id.toString() === id);
        setPost(staticPost || null);
      } finally {
        setLoading(false);
      }
    };

    fetchPostData();
  }, [id]);

  useEffect(() => {
    const fetchLikeStatusAndComments = async () => {
      if (!post) return;
      
      // Fetch likes
      if (user) {
        setLikeLoading(true);
        try {
          const liked = await getPostLikeStatus(user.id, post.id.toString());
          setIsLiked(liked);
        } catch {
          // ignore
        } finally {
          setLikeLoading(false);
        }
      } else {
        setLikeLoading(false);
      }

      // Fetch comments
      try {
        const commentsData = await getPostComments(post.id.toString());
        setComments(commentsData.comments || []);
      } catch (err) {
        console.error('Error fetching comments:', err);
      }
    };

    fetchLikeStatusAndComments();
  }, [post, user]);

  const copyPageLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Page link copied to clipboard");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title || 'Amptive Blog',
        url: window.location.href
      }).catch(() => {
        copyPageLink();
      });
    } else {
      copyPageLink();
    }
  };

  const handleToggleLike = async () => {
    if (!user) {
      toast.error("Please sign in to like this post", {
        action: {
          label: "Login",
          onClick: () => window.location.href = '/login'
        }
      });
      return;
    }

    if (!post || isLiking) return;

    setIsLiking(true);
    const prevLiked = isLiked;
    setIsLiked(!prevLiked);

    const success = await togglePostLike(user.id, post.id.toString(), prevLiked);
    
    if (!success) {
      setIsLiked(prevLiked);
      toast.error("Failed to update like status");
    }
    
    setIsLiking(false);
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please log in to add a comment");
      return;
    }
    if (!post || !newCommentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      await createPostComment(post.id.toString(), newCommentText);
      setNewCommentText('');
      toast.success('Comment posted successfully');
      
      // Refresh comments
      const commentsData = await getPostComments(post.id.toString());
      setComments(commentsData.comments || []);
    } catch (err) {
      toast.error('Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCreateReply = async (parentId: string, text: string) => {
    if (!user) {
      toast.error("Please log in to reply");
      return;
    }
    if (!post) return;
    await createPostComment(post.id.toString(), text, parentId);
    toast.success('Reply posted successfully');

    // Refresh comments
    const commentsData = await getPostComments(post.id.toString());
    setComments(commentsData.comments || []);
  };

  if (loading) {
    return (
      <AmptiveSplash />
    );
  }

  if (!post) {
    return (
      <div className="bg-white min-h-screen pt-32 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h2>
        <Link to="/blog" className="text-blue-600 hover:underline">Back to Blog</Link>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pt-20">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="flex flex-col gap-10">

          {/* Header */}
          <header className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex gap-4 flex-wrap justify-center items-center text-sm text-gray-500 font-medium">
                <span className="uppercase text-xs" style={{ color: post.color }}>{post.category}</span>
                <span className="text-gray-300">•</span>
                <span>{post.date}</span>
              </div>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 balance leading-tight">
              {post.title}
            </h1>

            {/* Authors */}
            {post.authors && post.authors.length > 0 && (
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="flex items-center justify-center -space-x-3">
                  {post.authors.map((author, index) => (
                    <div 
                      key={index}
                      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gray-100 overflow-hidden ring-1 ring-gray-100"
                      style={{ zIndex: (post.authors?.length || 0) - index }}
                    >
                      {author.image ? (
                        <img src={author.image} alt={author.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-semibold text-gray-600 uppercase">
                          {author.initials}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-2 text-base text-gray-600">
                  {post.authors.map((author, index) => (
                    <React.Fragment key={index}>
                      <span className="font-medium text-gray-900 hover:underline cursor-pointer">
                        {author.name}
                        {author.role && (
                          <span className="text-sm text-gray-400 font-normal ml-1">
                            ({author.role})
                          </span>
                        )}
                      </span>
                      {index < (post.authors?.length || 0) - 1 && <span>,</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button 
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                Share Post
              </button>
              {likeLoading ? (
                <div className="w-32 h-10 bg-gray-50 rounded-full animate-pulse" />
              ) : (
                <LikeButton isLiked={isLiked} onToggle={handleToggleLike} isLiking={isLiking} />
              )}
            </div>
          </header>

          {/* Cover Image */}
          <div className="w-full aspect-video rounded-3xl overflow-hidden border border-gray-100 shadow-sm mt-4">
             <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
          </div>

          {/* Content Body */}
          <article className="prose prose-slate prose-lg max-w-none pt-8 text-black prose-headings:text-black prose-p:text-black leading-relaxed">
            {contentUnavailable ? (
              <div>
                {fallbackExcerpt && <p className="text-lg">{fallbackExcerpt}</p>}
                <div className="not-prose mt-6 flex items-start gap-3 px-5 py-4 bg-amber-50 border border-amber-200/60 rounded-2xl">
                  <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    The full article couldn't be loaded right now. Please try again in a little while.
                  </p>
                </div>
              </div>
            ) : post.content ? (
              <div className="whitespace-pre-wrap">{post.content}</div>
            ) : (
              <>
                <section id="overview" className="scroll-mt-32">
                  <h2 className="group flex items-center gap-2 text-2xl font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6">
                    Overview
                    <a href="#overview" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Hash className="w-5 h-5 text-gray-400" />
                    </a>
                  </h2>
                  <p>
                    In this article, we explore the nuances of <strong>{post?.title}</strong> and how it impacts the ecosystem. 
                    This guide provides a comprehensive overview of the strategies and tips needed to master this topic.
                  </p>
                  <p className="mt-4">
                    Successful implementation requires a mix of technical rigor and creative problem-solving.
                    Whether you're just starting or looking to optimize your existing workflow, the following sections will provide valuable insights.
                  </p>
                </section>

                <section id="getting-started" className="scroll-mt-32 mt-12">
                  <h2 className="group flex items-center gap-2 text-2xl font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6">
                    Getting Started
                    <a href="#getting-started" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Hash className="w-5 h-5 text-gray-400" />
                    </a>
                  </h2>
                  <p>
                    To begin with <strong>{post?.category}</strong> best practices, you first need to understand the underlying principles of the Amptive platform.
                  </p>
                  <p className="font-bold text-black mt-8 mb-4">Key Objectives:</p>
                  <ul className="list-disc pl-5 space-y-2 text-black mb-8">
                    <li>Analyze market trends in {post?.category}</li>
                    <li>Implement scalable solutions</li>
                    <li>Measure impact using standard metrics</li>
                  </ul>
                </section>
              </>
            )}
          </article>

        </div>
      </div>
    </div>
  );
};

export default BlogPostDetail;
