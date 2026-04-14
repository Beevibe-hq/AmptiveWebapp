import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useState } from 'react';
import { toastError } from '@/lib/ui/toast';
import { uploadFile, getPublicUrl } from '@/lib/api/storage';
import {
    Heading1,
    Heading2,
    Minus,
    List,
    ListOrdered,
    Paperclip,
    Bold,
    Italic,
    Strikethrough,
    Loader2
} from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({
    value,
    onChange,
    placeholder = 'Start typing...',
}: RichTextEditorProps) {
    const [uploading, setUploading] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2],
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
            Link.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        class: {
                            default: null,
                        },
                    };
                },
            }).configure({
                openOnClick: false,
                HTMLAttributes: {
                    rel: 'noopener noreferrer',
                },
            }),
            Image.configure({
                inline: true,
                HTMLAttributes: {
                    class: 'w-20 h-20 object-cover rounded-xl border border-gray-200 shadow-sm inline-block mr-2 mb-2 align-top',
                },
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onChange(html);
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] px-5 py-4',
            },
        },
    });

    if (!editor) {
        return null;
    }

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
                if (!allowedTypes.includes(file.type)) {
                    toastError(`File type not supported: ${file.name}. Only images and PDFs are allowed.`);
                    continue;
                }

                const maxSize = 10 * 1024 * 1024;
                if (file.size > maxSize) {
                    toastError(`File too large: ${file.name}. Maximum size is 10MB.`);
                    continue;
                }

                const fileName = `event-assets/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;

                try {
                    const publicUrl = await uploadFile('event-assets', fileName, file);

                    const isImage = file.type.startsWith('image/');

                    if (isImage) {
                        editor.chain().focus().setImage({ src: publicUrl }).run();
                    } else {
                        const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
                        const svgString = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f9fafb" stroke="#e5e7eb" stroke-width="4"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-weight="bold" font-size="48" fill="#4b5563" text-anchor="middle" dy=".3em">${ext}</text></svg>`;
                        const base64Svg = `data:image/svg+xml;base64,${btoa(svgString)}`;

                        editor.chain().focus().setImage({ src: base64Svg, alt: file.name, title: file.name }).setLink({ href: publicUrl }).run();
                    }
                } catch (error) {
                    console.error('Error processing files:', error);
                    toastError('An error occurred while processing files.');
                }
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            toastError('An error occurred while processing files.');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    return (
        <div className={`rounded-2xl shadow-sm transition-all duration-300 focus-within:ring-4 focus-within:ring-blue-500/10 relative ${uploading ? 'ring-2 ring-blue-500/20 bg-blue-50/30' : 'bg-black/5'
            }`}>
            {/* Loading Overlay */}
            {uploading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-2xl">
                    <div className="flex flex-col items-center gap-3">
                        <span className="relative flex h-8 w-8">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <Loader2 className="relative inline-flex h-8 w-8 text-blue-500 animate-spin" />
                        </span>
                        <span className="text-sm font-medium text-blue-600 animate-pulse">Processing file...</span>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-1 border-b border-gray-200/50 px-3 py-2 flex-wrap">
                {/* H1 */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`p-2 rounded-lg transition-colors hover:bg-black/10 ${editor.isActive('heading', { level: 1 }) ? 'bg-black/10 text-indigo-600' : 'text-gray-600'
                        }`}
                    title="Heading 1"
                >
                    <Heading1 className="h-4 w-4" />
                </button>

                {/* H2 */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`p-2 rounded-lg transition-colors hover:bg-black/10 ${editor.isActive('heading', { level: 2 }) ? 'bg-black/10 text-indigo-600' : 'text-gray-600'
                        }`}
                    title="Heading 2"
                >
                    <Heading2 className="h-4 w-4" />
                </button>

                <div className="w-px h-4 bg-gray-300 mx-1" />

                {/* Bold */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-2 rounded-lg transition-colors hover:bg-black/10 ${editor.isActive('bold') ? 'bg-black/10 text-indigo-600' : 'text-gray-600'
                        }`}
                    title="Bold"
                >
                    <Bold className="h-4 w-4" />
                </button>

                {/* Italic */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-2 rounded-lg transition-colors hover:bg-black/10 ${editor.isActive('italic') ? 'bg-black/10 text-indigo-600' : 'text-gray-600'
                        }`}
                    title="Italic"
                >
                    <Italic className="h-4 w-4" />
                </button>

                {/* Strikethrough */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`p-2 rounded-lg transition-colors hover:bg-black/10 ${editor.isActive('strike') ? 'bg-black/10 text-indigo-600' : 'text-gray-600'
                        }`}
                    title="Strikethrough"
                >
                    <Strikethrough className="h-4 w-4" />
                </button>

                <div className="w-px h-4 bg-gray-300 mx-1" />

                {/* Bullet List */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-2 rounded-lg transition-colors hover:bg-black/10 ${editor.isActive('bulletList') ? 'bg-black/10 text-indigo-600' : 'text-gray-600'
                        }`}
                    title="Bullet List"
                >
                    <List className="h-4 w-4" />
                </button>

                {/* Ordered List */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-2 rounded-lg transition-colors hover:bg-black/10 ${editor.isActive('orderedList') ? 'bg-black/10 text-indigo-600' : 'text-gray-600'
                        }`}
                    title="Ordered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </button>

                <div className="w-px h-4 bg-gray-300 mx-1" />

                {/* Divider */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    className="p-2 rounded-lg transition-colors hover:bg-black/10 text-gray-600"
                    title="Horizontal Rule"
                >
                    <Minus className="h-4 w-4" />
                </button>

                {/* File Upload */}
                <label className="p-2 rounded-lg transition-colors hover:bg-black/10 text-gray-600 cursor-pointer relative">
                    <input
                        type="file"
                        className="hidden"
                        onChange={handleFileInput}
                        accept="image/*,.pdf"
                        multiple
                        disabled={uploading}
                    />
                    <Paperclip className={`h-4 w-4 ${uploading ? 'opacity-50' : ''}`} />
                </label>
            </div>

            <EditorContent editor={editor} />
        </div>
    );
}
