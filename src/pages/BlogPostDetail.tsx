import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Share2, Heart, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { blogPosts } from '@/lib/blog-data';
import { useAuth } from '@/contexts/AuthContext';
import { getPostLikeStatus, togglePostLike } from '@/lib/supabase/blog-likes';

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

const BlogPostDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  
  // Find the post by ID
  const post = blogPosts.find(p => p.id.toString() === id);

  const [isLiked, setIsLiked] = React.useState(false);
  const [isLiking, setIsLiking] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);

  // Fetch like status from DB on mount
  React.useEffect(() => {
    const fetchLikeStatus = async () => {
      if (!user || !id) {
        setInitialLoading(false);
        return;
      }
      
      const liked = await getPostLikeStatus(user.id, id);
      setIsLiked(liked);
      setInitialLoading(false);
    };

    fetchLikeStatus();
  }, [user, id]);

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

    if (!id || isLiking) return;

    setIsLiking(true);
    // Optimistic update
    const prevLiked = isLiked;
    setIsLiked(!prevLiked);

    const success = await togglePostLike(user.id, id, prevLiked);
    
    if (!success) {
      // Revert on failure
      setIsLiked(prevLiked);
      toast.error("Failed to update like status");
    }
    
    setIsLiking(false);
  };

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
              {initialLoading ? (
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
          </article>

        </div>
      </div>
    </div>
  );
};

export default BlogPostDetail;
