import { useEffect, useMemo, useState } from 'react';
import { Archive, Edit3, Eye, FileText, Loader2, Plus, RefreshCw, Send, X } from 'lucide-react';
import {
  archiveBlogPost,
  BlogPostFromAPI,
  BlogPostPayload,
  createBlogPost,
  getManageablePosts,
  publishBlogPost,
  updateBlogPost,
} from '@/lib/api/blog';
import { uploadImage } from '@/lib/api/storage';
import { useAuth } from '@/contexts/AuthContext';
import { toastError, toastSuccess } from '@/lib/ui/toast';

const BLOG_ADMIN_EMAIL = 'jachilonu195@gmail.com';

const emptyForm: BlogPostPayload = {
  title: '',
  excerpt: '',
  content: '',
  featured_image_url: '',
  seo_title: '',
  seo_description: '',
};

const getPostStatusClass = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === 'published') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (normalized === 'archived') return 'bg-gray-100 text-gray-500 border-gray-200';
  return 'bg-amber-50 text-amber-700 border-amber-100';
};

const formatDate = (date?: string) => {
  if (!date) return 'Recent';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  } catch {
    return 'Recent';
  }
};

const getPostId = (post: BlogPostFromAPI | null | undefined) => post?.id || (post as any)?.post_id || '';

export default function DashboardBlog() {
  const { user } = useAuth();
  const isBlogAdmin = user?.email?.toLowerCase() === BLOG_ADMIN_EMAIL;
  const [posts, setPosts] = useState<BlogPostFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStatus, setActiveStatus] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPostFromAPI | null>(null);
  const [form, setForm] = useState<BlogPostPayload>(emptyForm);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchPosts = async () => {
    if (!isBlogAdmin) return;
    setLoading(true);
    try {
      const response = await getManageablePosts({
        status: activeStatus === 'all' ? undefined : activeStatus,
        page_size: 100,
      });
      setPosts(response.posts || []);
    } catch (error) {
      toastError((error as Error).message || 'Failed to load blog posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPosts();
  }, [isBlogAdmin, activeStatus]);

  const stats = useMemo(() => {
    return posts.reduce(
      (acc, post) => {
        const status = post.status || 'draft';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      { draft: 0, published: 0, archived: 0 } as Record<string, number>
    );
  }, [posts]);

  const openCreateForm = () => {
    setEditingPost(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (post: BlogPostFromAPI) => {
    setEditingPost(post);
    setForm({
      title: post.title || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      featured_image_url: post.featured_image_url || '',
      seo_title: post.seo_title || '',
      seo_description: post.seo_description || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (publishAfterSave = false) => {
    if (!form.title.trim() || !form.content.trim()) {
      toastError('Title and content are required');
      return;
    }

    setSaving(true);
    try {
      const payload: BlogPostPayload = {
        title: form.title.trim(),
        content: form.content.trim(),
        excerpt: form.excerpt?.trim() || null,
        featured_image_url: form.featured_image_url?.trim() || null,
        seo_title: form.seo_title?.trim() || null,
        seo_description: form.seo_description?.trim() || null,
      };

      const savedPost = editingPost
        ? await updateBlogPost(getPostId(editingPost), payload)
        : await createBlogPost(payload);

      if (publishAfterSave) {
        const postId = getPostId(savedPost) || getPostId(editingPost);
        if (!postId) throw new Error('Blog post was saved, but no post ID was returned.');
        await publishBlogPost(postId);
        toastSuccess('Blog post published');
      } else {
        toastSuccess(editingPost ? 'Blog post updated' : 'Draft created');
      }

      setShowForm(false);
      setEditingPost(null);
      setForm(emptyForm);
      await fetchPosts();
    } catch (error) {
      toastError((error as Error).message || 'Failed to save blog post');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (post: BlogPostFromAPI) => {
    setSaving(true);
    try {
      const postId = getPostId(post);
      if (!postId) throw new Error('No post ID found.');
      await publishBlogPost(postId);
      toastSuccess('Blog post published');
      await fetchPosts();
    } catch (error) {
      toastError((error as Error).message || 'Failed to publish blog post');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (post: BlogPostFromAPI) => {
    if (!confirm(`Archive "${post.title}"?`)) return;
    setSaving(true);
    try {
      const postId = getPostId(post);
      if (!postId) throw new Error('No post ID found.');
      await archiveBlogPost(postId);
      toastSuccess('Blog post archived');
      await fetchPosts();
    } catch (error) {
      toastError((error as Error).message || 'Failed to archive blog post');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toastError('Please choose an image file');
      return;
    }

    setUploadingImage(true);
    try {
      const url = await uploadImage(file, 'livestream-banner');
      setForm((prev) => ({ ...prev, featured_image_url: url }));
      toastSuccess('Image uploaded');
    } catch (error) {
      toastError((error as Error).message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  if (!isBlogAdmin) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-16">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-black/[0.04]">
            <FileText className="h-5 w-5 text-black/40" />
          </div>
          <h1 className="text-xl font-bold text-black">Blog admin is unavailable</h1>
          <p className="mt-2 text-sm text-black/50">This section is only enabled for the Amptive blog admin account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 md:px-8">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Blog</h1>
          <p className="mt-1 text-[15px] text-black/40">Create drafts, edit articles, and publish Amptive blog posts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPosts}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-[#FDFDFD] px-3 py-2 text-sm font-medium text-black hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 text-black/60" />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-[#FDFDFD] px-3 py-2 text-sm font-medium text-black hover:bg-gray-50"
          >
            <Plus className="h-4 w-4 text-black/60" />
            New Post
          </button>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {(['all', 'draft', 'published', 'archived'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setActiveStatus(status)}
            className={`rounded-full px-5 py-3 text-sm font-medium capitalize transition-all ${
              activeStatus === status ? 'bg-[#F2F2F2] text-black' : 'text-black/60 hover:bg-black/5'
            }`}
          >
            {status}
            {status !== 'all' && <span className="ml-2 text-black/35">{stats[status] || 0}</span>}
          </button>
        ))}
      </div>

      {showForm && (
        <section className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-black">{editingPost ? 'Edit Post' : 'New Blog Post'}</h2>
              <p className="text-sm text-black/45">Posts save as drafts until you publish them.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg p-2 text-black/40 hover:bg-black/5 hover:text-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold uppercase text-black/40">Title</span>
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-black"
                placeholder="Enter post title"
              />
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold uppercase text-black/40">Excerpt</span>
              <textarea
                value={form.excerpt || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                className="min-h-20 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
                placeholder="Short summary shown in the blog list"
              />
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold uppercase text-black/40">Content</span>
              <textarea
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                className="min-h-64 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm leading-6 outline-none focus:border-black"
                placeholder="Write the article body"
              />
            </label>

            <div className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase text-black/40">Featured Image</span>
              <div className="grid gap-3 md:grid-cols-[144px_1fr] md:items-start">
                <div className="aspect-[16/10] overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  {form.featured_image_url ? (
                    <img src={form.featured_image_url} alt="Featured image preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <FileText className="h-5 w-5 text-black/25" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={form.featured_image_url || ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, featured_image_url: e.target.value }))}
                      className="h-11 min-w-0 flex-1 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-black"
                      placeholder="Paste image URL or upload from your computer"
                    />
                    <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-black hover:bg-gray-50">
                      {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin text-black/50" /> : <Plus className="h-4 w-4 text-black/50" />}
                      Upload image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingImage}
                        onChange={(e) => {
                          void handleImageUpload(e.target.files?.[0] || null);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  {form.featured_image_url && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, featured_image_url: '' }))}
                      className="text-xs font-semibold text-black/40 hover:text-black"
                    >
                      Remove image
                    </button>
                  )}
                </div>
              </div>
            </div>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase text-black/40">SEO Title</span>
              <input
                value={form.seo_title || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, seo_title: e.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-black"
                placeholder="Optional"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase text-black/40">SEO Description</span>
              <input
                value={form.seo_description || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, seo_description: e.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-black"
                placeholder="Optional"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-gray-50 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Save & Publish
            </button>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-black/45">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading posts...
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-black/20" />
            <h2 className="text-base font-bold text-black">No blog posts found</h2>
            <p className="mt-1 text-sm text-black/45">Create a new post to start the blog queue.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {posts.map((post) => (
              <article key={post.id} className="grid gap-4 p-4 md:grid-cols-[96px_1fr_auto] md:items-center">
                <div className="h-24 w-24 overflow-hidden rounded-lg bg-gray-100">
                  {post.featured_image_url ? (
                    <img src={post.featured_image_url} alt={post.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <FileText className="h-5 w-5 text-black/25" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-1 text-[11px] font-bold capitalize ${getPostStatusClass(post.status || 'draft')}`}>
                      {post.status || 'draft'}
                    </span>
                    <span className="text-xs text-black/35">{formatDate(post.updated_at || post.created_at)}</span>
                  </div>
                  <h3 className="truncate text-base font-bold text-black">{post.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-black/45">{post.excerpt || 'No excerpt added.'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  {post.slug && post.status === 'published' && (
                    <a
                      href={`/blog/${post.slug}`}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-black hover:bg-gray-50"
                    >
                      <Eye className="h-4 w-4 text-black/50" />
                      View
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => openEditForm(post)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-black hover:bg-gray-50"
                  >
                    <Edit3 className="h-4 w-4 text-black/50" />
                    Edit
                  </button>
                  {post.status !== 'published' && (
                    <button
                      type="button"
                      onClick={() => handlePublish(post)}
                      disabled={saving}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-60"
                    >
                      <Send className="h-4 w-4 text-black/50" />
                      Publish
                    </button>
                  )}
                  {post.status !== 'archived' && (
                    <button
                      type="button"
                      onClick={() => handleArchive(post)}
                      disabled={saving}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-60"
                    >
                      <Archive className="h-4 w-4 text-black/50" />
                      Archive
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
