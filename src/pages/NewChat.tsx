import React, { useState, useRef, useEffect } from 'react';

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
import { Plus, Loader2, X } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { TypingPlaceholder } from '../components/TypingPlaceholder';
import { useNavigate } from 'react-router-dom';

interface FileAttachment {
  type: 'image' | 'file';
  url: string;
  name: string;
  size: number;
  file: File;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  attachments?: FileAttachment[];
}

// Constants for file upload limits
const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const NewChat = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea and handle scroll position
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set the height to scrollHeight, but not more than 160px
      const newHeight = Math.min(textarea.scrollHeight, 160);
      textarea.style.height = `${newHeight}px`;
      
      // On mobile, scroll to show the textarea when it's focused
      if (isInputFocused && window.innerWidth < 768) {
        setTimeout(() => {
          textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [input, isInputFocused]);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with empty messages and scroll to top
  useEffect(() => {
    setMessages([]);
    // Scroll to top of the page on initial load
    window.scrollTo(0, 0);
    // Also ensure the main content container is scrolled to top
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    const options = {
      ...toastOptions,
      duration: 3000,
      style: {
        ...toastOptions.style,
        background: '#ffffff',
        color: '#1f2937',
        padding: '10px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        fontSize: '14px',
        border: '1px solid #e5e7eb',
        whiteSpace: 'nowrap',
        overflow: 'visible',
      },
      iconTheme: {
        primary: type === 'error' ? '#EF4444' : '#10B981',
        secondary: 'white',
      }
    };

    if (type === 'error') {
      toast.error(message, options);
    } else {
      toast.success(message, options);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    const totalFiles = attachments.length + newFiles.length;
    
    if (totalFiles > MAX_ATTACHMENTS) {
      showToast(`Max ${MAX_ATTACHMENTS} files allowed`);
      return;
    }

    // Check file sizes
    const oversizedFiles = newFiles.filter(file => file.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      showToast(`Max ${MAX_FILE_SIZE_MB}MB per file`);
      return;
    }

    const newAttachments = newFiles.map(file => ({
      type: (file.type.startsWith('image/') ? 'image' : 'file') as 'image' | 'file',
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      file: file
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Process attachments if any
      let uploadedAttachments: FileAttachment[] = [];
      
      if (attachments.length > 0) {
        setIsFileUploading(true);
        // Convert files to base64 for transfer
        uploadedAttachments = await Promise.all(attachments.map(async (attachment) => {
          const base64 = await fileToBase64(attachment.file);
          return {
            type: attachment.type,
            url: URL.createObjectURL(attachment.file),
            name: attachment.file.name,
            size: attachment.file.size,
            file: attachment.file,
            base64: base64  // Include base64 data for transfer
          };
        }));
      }
      
      // Check if user is requesting an image
      const isImageRequest = /(create|generate|make).*(image|picture|photo|art)/i.test(input);
      
      // Create the initial message
      const initialMessage: Message = {
        id: Date.now().toString(),
        content: input,
        sender: 'user',
        timestamp: new Date(),
        attachments: uploadedAttachments,
        ...(isImageRequest ? { type: 'image_loading' as const } : {})
      };
      
      // Store the message in session storage
      sessionStorage.setItem('initialMessage', JSON.stringify(initialMessage));
      
      // Navigate to chat mode
      navigate('/chat-mode');
    } catch (error) {
      console.error('Error submitting message:', error);
      // Handle error
    } finally {
      setIsLoading(false);
      setIsFileUploading(false);
    }
  };


  const toastOptions = {
    style: { 
      maxWidth: '200px',
      margin: '0 auto',
      left: '50%',
      transform: 'translateX(-50%)',
      textAlign: 'center' as const
    }
  };

  return (
    <div className="relative flex h-screen bg-gray-50">
      <Toaster position="top-center" />
      {/* Background Image */}
      <div className="absolute inset-0 z-0 w-full h-full overflow-hidden">
        <img 
          src="/images/Frame 254 (3).svg"
          alt="Background"
          className="w-full h-full object-cover"
        />
        {/* Animated Stars Overlay */}
        <div className="absolute inset-0">
          {Array.from({ length: 15 }).map((_, i) => (
            <div 
              key={i}
              className="absolute rounded-full bg-pink-300 animate-pulse"
              style={{
                width: `${Math.random() * 4 + 2}px`,
                height: `${Math.random() * 4 + 2}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDuration: `${Math.random() * 3 + 2}s`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex w-full">
        <div className="flex-1 flex flex-col">
          <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-8">
            <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-4">
              {/* Welcome message */}
              <div className="font-display text-black w-full flex-col items-center text-center max-md:flex sm:-ml-0.5 sm:block">
                <div className="text-lg font-medium mb-2">
                  Amptive AI
                </div>
                <div className="text-[24px] sm:text-4xl font-semibold leading-tight">
                  What should we create today?
                </div>
              </div>

            {/* Chat messages */}
            <div className="w-full space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} px-4 py-3 rounded-xl`}>
                    <div className="whitespace-pre-line">{message.content}</div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-3 rounded-xl">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="w-full">
              {/* File input (hidden) */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              
              <form 
                onSubmit={handleSubmit} 
                className="group flex flex-col gap-2 p-3 w-full rounded-3xl border border-gray-200 bg-white text-base shadow-lg transition-all duration-150 ease-in-out focus-within:border-gray-300 hover:border-gray-300 focus-within:hover:border-gray-400"
              >
                {/* File previews */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="relative group">
                        {attachment.type === 'image' ? (
                          <div className="relative w-16 h-16 rounded-md overflow-hidden border border-gray-200">
                            <img 
                              src={attachment.url} 
                              alt={attachment.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-16 h-16 rounded-md border border-gray-200 bg-gray-50">
                            <div className="text-xs text-center p-1 break-words">
                              {attachment.name.split('.').pop()?.toUpperCase()}
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="absolute -top-2 -right-2 bg-gray-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3 text-gray-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="w-full relative">
                  <div className="absolute top-2 left-3 right-3 pointer-events-none break-words whitespace-normal">
                    {!input && !isInputFocused && attachments.length === 0 && (
                      <TypingPlaceholder isFocused={isInputFocused} />
                    )}
                  </div>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isLoading ? 'Generating response...' : attachments.length > 0 ? 'Add a message (optional)' : ''}
                    maxLength={5000}
                    className={`w-full h-full resize-none bg-transparent border-none outline-none text-base text-black placeholder-gray-400 pl-3 pr-4 pt-2 overflow-hidden ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    rows={1}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    ref={textareaRef}
                    style={{ 
                      minHeight: '80px',
                      height: 'auto',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#e5e7eb transparent'
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading || isFileUploading}
                  />
                </div>
                <div className="flex gap-2 flex-wrap items-center mt-2 w-full">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isFileUploading}
                    className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors duration-100 ease-in-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-300 disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-white shadow-sm hover:bg-gray-50 hover:border-gray-300 py-2 h-8 gap-1.5 rounded-full px-3 text-gray-500 hover:text-gray-700"
                  >
                    <Plus className="h-4 w-4 text-black" />
                    <span className="hidden md:flex text-black">Attach</span>
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors duration-100 ease-in-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-300 disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-white shadow-sm hover:bg-gray-50 hover:border-gray-300 py-2 h-8 gap-1.5 rounded-full px-3 text-gray-500 hover:text-gray-700"
                  >
                    <img 
                      src="/images/images-outline.svg" 
                      alt="Library" 
                      className="h-4 w-4"
                    />
                    <span className="hidden md:flex text-black">Library</span>
                  </button>
                  
                  <button
                    type="button"
                    className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors duration-100 ease-in-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-300 disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-white shadow-sm hover:bg-gray-50 hover:border-gray-300 py-2 h-8 gap-1.5 rounded-full px-3 text-gray-500 hover:text-gray-700"
                  >
                    <img 
                      src="/images/chatbubbles-outline.svg" 
                      alt="Chats" 
                      className="h-4 w-4"
                    />
                    <span className="hidden md:flex text-black">Chats</span>
                  </button>
                  
                  <div className="ml-auto">
                    <button
                      type="submit"
                      disabled={(!input.trim() && attachments.length === 0) || isLoading || isFileUploading}
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-opacity duration-150 ease-out ${
                        (!input.trim() && attachments.length === 0) || isLoading || isFileUploading
                          ? 'bg-gray-300 cursor-not-allowed opacity-70'
                          : 'bg-black text-white hover:bg-gray-800'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 -960 960 960" className="h-5 w-5" fill="currentColor">
                        <path d="M442.39-616.87L309.78-487.26q-11.82 11.83-27.78 11.33t-27.78-12.33q-11.83-11.83-11.83-27.78 0-15.96 11.83-27.79l198.43-199q11.83-11.82 28.35-11.82t28.35 11.82l198.43 199q11.83 11.83 11.83 27.79 0 15.95-11.83 27.78-11.82 11.83-27.78 11.83t-27.78-11.83L521.61-618.87v348.83q0 16.95-11.33 28.28-11.32 11.33-28.28 11.33t-28.28-11.33q-11.33-11.33-11.33-28.28v-348.83z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
  );
};

export default NewChat;
