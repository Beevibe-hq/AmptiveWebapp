import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Check, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { blogPosts as posts, blogCategories as categories } from '@/lib/blog-data';

const Blog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const featuredPosts = useMemo(() => {
    return posts.filter(post => 
      post.featured && post.title.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 3);
  }, [searchQuery]);

  const allPosts = useMemo(() => {
    // We show all posts that are NOT in the featured list (filtered by search)
    // AND match the active tag.
    const featuredIds = new Set(featuredPosts.map(p => p.id));
    return posts.filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = activeTag === 'All' || post.category === activeTag;
      const notFeatured = !featuredIds.has(post.id);
      return matchesSearch && matchesTag && notFeatured;
    });
  }, [searchQuery, activeTag, featuredPosts]);

  // Simulate loading state for filters
  React.useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTag]);

  return (
    <div className="bg-white min-h-screen font-sans antialiased text-gray-900 pb-20">
      <style dangerouslySetInnerHTML={{ __html: `
        .page-container {
          margin-left: auto;
          margin-right: auto;
          padding-left: 1.5rem;
          padding-right: 1.5rem;
        }
        .heading-2xl {
          font-size: 3rem;
          line-height: 1;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        @media (min-width: 768px) {
          .heading-2xl { font-size: 4rem; }
        }
        .text-secondary { color: #64748b; }
        .bg-primary-soft { background-color: #f1f5f9; }
        .bg-primary-soft-hover:hover { background-color: #e2e8f0; }
        .resource-item:hover .resource-img { transform: scale(1.05); }
        .icon-shadow { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }
        .ui-font { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
      ` }} />


      <div className="page-container max-w-6xl pt-24 md:pt-32">
        <header className="text-center py-12 flex flex-col gap-6">
          <h1 className="heading-2xl mb-0 pb-0">Blog</h1>
          <p className="mx-auto max-w-2xl text-lg text-secondary">
            Insights, guides, and stories to help you build and grow with Amptive.
          </p>
          
          <div className="max-w-2xl mx-auto w-full relative group">
            <div className="relative w-full">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10 w-5 h-5" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles, guides..." 
                className="peer w-full h-14 pl-14 pr-14 text-base text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {categories.slice(1, 4).map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveTag(cat === activeTag ? 'All' : cat)}
                  className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                    activeTag === cat 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Featured Section */}
        <section className="space-y-8 mb-24">
          <h2 className="text-2xl font-bold">Featured</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {featuredPosts.length > 0 ? (
              featuredPosts.map((post) => (
                <Link 
                  key={post.id}
                  to={`/blog/${post.id}`} 
                  className="resource-item group flex gap-4 lg:flex-col items-start text-left no-underline"
                >
                  <div className="relative flex-none w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 lg:w-full lg:h-48 overflow-hidden rounded-xl bg-gray-100">
                    <img 
                      src={post.image} 
                      alt={post.title} 
                      className="resource-img w-full h-full object-cover transition-all duration-500 ease-out group-hover:brightness-[0.85]" 
                    />
                  </div>
                  <div className="w-full">
                    <h4 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mt-2">
                      {post.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-y-1 mt-2">
                      <span className="text-xs font-medium uppercase ui-font" style={{ color: post.color }}>
                        {post.category}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-3 py-12 text-center text-gray-500">
                No featured posts found matching your search.
              </div>
            )}
          </div>
        </section>

        {/* All Posts Section */}
        <section className="min-h-[60vh] mt-4">
          <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-6">
            <h2 className="text-2xl font-bold flex items-center">
              {activeTag === 'All' ? 'All Posts' : activeTag}
              <span className="text-sm font-normal text-gray-400 ml-3 bg-gray-50 px-2 py-0.5 rounded-md">
                {allPosts.length}
              </span>
            </h2>
            
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-all ${
                  isFilterOpen ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filter
                <ChevronDown className={`w-3 h-3 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isFilterOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-2xl py-2 z-20 overflow-hidden"
                  >
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setActiveTag(cat);
                          setIsFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                          activeTag === cat ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {cat}
                        {activeTag === cat && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
            {isLoading ? (
              // Skeleton cards
              [...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col items-start w-full">
                  <div className="w-full aspect-[16/10] rounded-xl bg-gray-100 animate-pulse" />
                  <div className="w-full mt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                      <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="h-5 w-full bg-gray-100 rounded animate-pulse" />
                    <div className="h-5 w-2/3 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))
            ) : allPosts.length > 0 ? (
              allPosts.map((post) => (
                <Link 
                  key={post.id}
                  to={`/blog/${post.id}`} 
                  className="resource-item group flex flex-col items-start text-left no-underline"
                >
                  <div className="relative w-full aspect-[16/10] overflow-hidden rounded-xl bg-gray-100">
                    <img 
                      src={post.image} 
                      alt={post.title} 
                      className="resource-img w-full h-full object-cover transition-all duration-500 ease-out group-hover:brightness-[0.85]" 
                    />
                  </div>
                  <div className="w-full mt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-medium uppercase ui-font" style={{ color: post.color }}>
                        {post.category}
                      </span>
                      <span className="text-[11px] text-gray-400 font-medium">
                        {post.date}
                      </span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {post.title}
                    </h4>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-1 md:col-span-2 lg:col-span-3 py-24 text-center">
                <div className="text-gray-300 mb-4">
                  <Search className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No results found</h3>
                <p className="text-gray-500">We couldn't find any articles matching "{searchQuery}"</p>
                <button 
                  onClick={() => {setSearchQuery(''); setActiveTag('All');}}
                  className="mt-6 text-blue-600 font-bold hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

    </div>
  );
};

export default Blog;
