import React, { useState, useRef, useEffect } from 'react';
import { Plus, Image as ImageIcon, Zap, Loader2, Image as ImageIcon2, Copy, Check, ThumbsUp, ThumbsDown, RotateCw, Download, File as FileIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  Root as DropdownMenu,
  Trigger as DropdownMenuTrigger,
  Portal as DropdownMenuPortal,
  Content as DropdownMenuContent,
  Item as DropdownMenuItem,
  Label as DropdownMenuLabel,
  Group as DropdownMenuGroup,
  Separator as DropdownMenuSeparator,
  Sub as DropdownMenuSub,
  SubTrigger as DropdownMenuSubTrigger,
  SubContent as DropdownMenuSubContent
} from '@radix-ui/react-dropdown-menu';

interface FileAttachment {
  type: 'image' | 'file';
  url: string;
  name: string;
  size: number;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  username?: string;
  timestamp: Date;
  type?: 'text' | 'image' | 'image_loading';
  imageUrl?: string;
  isLoading?: boolean;
  attachments?: FileAttachment[];
}


// Action tray component for AI messages
const MessageActions = ({ 
  content,
  onRegenerate,
  isImage = false
}: { 
  content: string,
  onRegenerate: () => void,
  isImage?: boolean
}) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleFeedback = (type: 'like' | 'dislike') => {
    setFeedback(type);
    
    toast.success('Thanks for your feedback!', {
      duration: 3000,
      style: {
        background: '#ffffff',
        color: '#1f2937',
        padding: '10px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        fontSize: '14px',
        marginTop: '20px',
        border: '1px solid #e5e7eb',
        maxWidth: '280px',
        width: 'fit-content',
        minWidth: 'auto',
        marginLeft: 'auto',
        marginRight: 'auto',
      },
      iconTheme: {
        primary: '#10B981',
        secondary: 'white',
      }
    });
  };

  const handleDownload = () => {
    if (!isImage) return;
    
    const link = document.createElement('a');
    link.href = content;
    link.download = `generated-image-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center gap-2 mt-1 -mb-2 text-gray-400">
      {!isImage && (
        <button 
          onClick={handleCopy}
          className="p-1 rounded-full hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
      
      {isImage && (
        <button 
          onClick={handleDownload}
          className="p-1 rounded-full hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Download image"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      )}
      
      <button 
        onClick={() => handleFeedback('like')}
        className={`p-1 rounded-full hover:bg-gray-100 hover:text-gray-600 transition-colors ${feedback === 'like' ? 'text-green-500' : ''}`}
        title={isImage ? "Like this image" : "Like this response"}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button 
        onClick={() => handleFeedback('dislike')}
        className={`p-1 rounded-full hover:bg-gray-100 hover:text-gray-600 transition-colors ${feedback === 'dislike' ? 'text-red-500' : ''}`}
        title={isImage ? "Dislike this image" : "Dislike this response"}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
      
      <button 
        onClick={onRegenerate}
        className="p-1 rounded-full hover:bg-gray-100 hover:text-gray-600 transition-colors"
        title={isImage ? "Generate new image" : "Regenerate response"}
      >
        <RotateCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// Image display component with better error handling and loading states
const ImageMessage = ({ imageUrl }: { imageUrl: string }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  return (
    <div className="relative group w-full max-w-md">
      <div 
        className="relative overflow-hidden rounded-xl bg-gray-100 w-full"
        style={{
          aspectRatio: '4/3',
          minHeight: '300px',
          maxWidth: '100%',
          height: 'auto'
        }}
      >
        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <div className="shimmer-text text-lg">Creating your image...</div>
          </div>
        )}
        {error ? (
          <div className="flex items-center justify-center h-full p-6 text-center text-gray-500">
            <div>
              <div className="text-red-400 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p>Couldn't load the image.</p>
              <button 
                onClick={() => {
                  setError(false);
                  setIsLoading(true);
                }}
                className="mt-2 text-blue-500 hover:text-blue-600 text-sm font-medium"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <>
            <img
              src={imageUrl}
              alt="Generated content"
              className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onLoad={() => setIsLoading(false)}
              onError={() => setError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </>
        )}
      </div>
      {!error && (
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center">
            <ImageIcon2 className="h-3 w-3 mr-1" />
            AI Generated
          </div>
        </div>
      )}
    </div>
  );
};

// User avatar component
const Avatar = ({ name }: { name?: string }) => {
  const firstLetter = name ? name.charAt(0).toUpperCase() : 'U';
  
  return (
    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-[#299AFC] flex items-center justify-center text-white text-xs font-medium">
      {firstLetter}
    </div>
  );
};

const useTypingAnimation = (phrases: string[], typingSpeed = 100, deletingSpeed = 50, pauseDuration = 2000) => {
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  
  // Cursor blink effect
  useEffect(() => {
    if (displayText.length > 0) {
      const cursorInterval = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 500);
      return () => clearInterval(cursorInterval);
    } else {
      setShowCursor(true);
    }
  }, [displayText]);

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (currentCharIndex < currentPhrase.length) {
          setDisplayText(currentPhrase.substring(0, currentCharIndex + 1));
          setCurrentCharIndex(currentCharIndex + 1);
        } else {
          // Finished typing, pause then start deleting
          setTimeout(() => setIsDeleting(true), pauseDuration);
        }
      } else {
        // Deleting
        if (currentCharIndex > 0) {
          setDisplayText(currentPhrase.substring(0, currentCharIndex - 1));
          setCurrentCharIndex(currentCharIndex - 1);
        } else {
          // Finished deleting, move to next phrase
          setIsDeleting(false);
          setCurrentPhraseIndex((currentPhraseIndex + 1) % phrases.length);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(timeout);
  }, [currentPhraseIndex, currentCharIndex, isDeleting, phrases, typingSpeed, deletingSpeed, pauseDuration]);

  return { text: displayText, showCursor };
};

const ChatMode = () => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set the height to scrollHeight, but not more than 160px
      const newHeight = Math.min(textarea.scrollHeight, 160);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessage, setTypingMessage] = useState<{id: string; content: string; visibleChars: number} | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [placeholderText] = useState('Message AI...');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const fileUploadRef = useRef<HTMLDivElement>(null);
  
  const toastOptions = {
    style: { 
      maxWidth: '200px',
      margin: '0 auto',
      left: '50%',
      transform: 'translateX(-50%)',
      textAlign: 'center'
    }
  };
  const MAX_ATTACHMENTS = 5;
  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const totalFiles = attachments.length + newFiles.length;
      
      if (totalFiles > MAX_ATTACHMENTS) {
        toast.error(`Max ${MAX_ATTACHMENTS} files allowed`, toastOptions);
        return;
      }

      // Check file sizes
      const oversizedFiles = newFiles.filter(file => file.size > MAX_FILE_SIZE_BYTES);
      if (oversizedFiles.length > 0) {
        toast.error(`Max ${MAX_FILE_SIZE_MB}MB per file`, toastOptions);
        return;
      }
      
      setAttachments(prev => [...prev, ...newFiles]);
      // Reset file input to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  const renderFilePreviews = () => {
    if (attachments.length === 0) return null;
    
    const remainingAttachments = MAX_ATTACHMENTS - attachments.length;
    const showRemainingCounter = remainingAttachments > 0 && remainingAttachments < 5;
    
    return (
      <div className="mb-1.5 flex gap-1.5 overflow-x-auto pb-1.5">
        {showRemainingCounter && (
          <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center text-xs text-gray-500 border border-dashed border-gray-300 rounded-md">
            +{remainingAttachments}
          </div>
        )}
        {attachments.map((file, index) => {
          const isImage = file.type.startsWith('image/');
          const fileSize = (file.size / 1024).toFixed(1);
          
          return (
            <div key={index} className="relative group flex-shrink-0 w-14 h-14">
              {isImage ? (
                <div className="w-full h-full bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt={file.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-gray-50 rounded-md border border-gray-200 flex flex-col items-center justify-center p-1">
                  <FileIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-[8px] text-gray-500 text-center truncate w-full">
                    {file.name.split('.').pop()?.toUpperCase()}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAttachment(index);
                }}
                className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow-sm hover:bg-red-50 transition-colors text-red-500 hover:text-red-600 z-50 flex items-center justify-center w-6 h-6"
                style={{ boxShadow: '0 0 0 2px white' }}
                title="Remove file"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="12" 
                  height="12" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="text-gray-600"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[8px] p-0.5 truncate px-1 rounded-b-md">
                {fileSize} KB
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Close popup when clicking outside

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fileUploadRef.current && !fileUploadRef.current.contains(event.target as Node)) {
        // setShowFileUpload(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with empty messages
  useEffect(() => {
    setMessages([]);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Prevent submission if input is empty, already loading, or an image is being generated
      if (input.trim() && !isLoading && !messages.some(msg => msg.type === 'image_loading')) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  // Simulate image generation with a more reliable image source
  const generateImage = async (prompt: string): Promise<string> => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use a more reliable image source
      const searchTerm = encodeURIComponent(prompt.split(' ').slice(0, 3).join(' '));
      const width = 800;
      const height = 600;
      
      // Using picsum.photos for more reliable placeholder images
      const imageUrl = `https://picsum.photos/seed/${searchTerm}-${Date.now()}/${width}/${height}`;
      
      console.log('Generated image URL:', imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('Error in generateImage:', error);
      // Fallback to a default image if there's an error
      return 'https://picsum.photos/800/600';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent submission if input is empty and no attachments, already loading, or an image is being generated
    if ((!input.trim() && attachments.length === 0) || isLoading || messages.some(msg => msg.type === 'image_loading')) return;

    const userInput = input.trim();
    
    // Handle file uploads if any
    if (attachments.length > 0) {
      setIsFileUploading(true);
      try {
        // Here you would typically upload files to your server
        // For now, we'll just create previews
        const uploadedFiles = await Promise.all(
          attachments.map(async (file) => {
            if (file.type.startsWith('image/')) {
              const imageUrl = URL.createObjectURL(file);
              return {
                type: 'image' as const,
                url: imageUrl,
                name: file.name,
                size: file.size
              };
            }
            return {
              type: 'file' as const,
              url: URL.createObjectURL(file),
              name: file.name,
              size: file.size
            };
          })
        );

        // Add message with attachments
        const messageWithAttachments: Message = {
          id: Date.now().toString(),
          content: userInput || 'Shared a file',
          sender: 'user',
          username: 'User',
          timestamp: new Date(),
          attachments: uploadedFiles
        };

        setMessages(prev => [...prev, messageWithAttachments]);
        setInput('');
        setAttachments([]);
      } catch (error) {
        console.error('Error uploading files:', error);
        toast.error('Failed to upload files. Please try again.');
      } finally {
        setIsFileUploading(false);
      }
      return;
    }
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: userInput,
      sender: 'user',
      username: 'User', // This would come from your auth system
      timestamp: new Date(),
    };

    // Add user message
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Check if user is requesting an image
      const isImageRequest = /(create|generate|make).*(image|picture|photo|art)/i.test(userInput);
      
      if (isImageRequest) {
        const messageId = (Date.now() + 1).toString();
        
        // Create the final message structure immediately with loading state
        const loadingMessage = {
          id: messageId,
          content: 'Creating your image...',
          sender: 'ai' as const,
          type: 'image_loading' as const,
          timestamp: new Date(),
          imageUrl: ''
        };
        
        // Add the loading message
        setMessages(prev => [...prev, loadingMessage]);
        
        try {
          // Generate the image - this will trigger the ImageMessage component's loading state
          const imageUrl = await generateImage(userInput);
          
          // Update to show the final image
          setMessages(prev => prev.map(msg => 
            msg.id === messageId 
              ? {
                  ...msg,
                  content: `Here's the image you requested: ${userInput}`,
                  type: 'image' as const,
                  imageUrl
                }
              : msg
          ));
        } catch (error) {
          console.error('Error generating image:', error);
          // Update with error message if generation fails
          setMessages(prev => prev.map(msg => 
            msg.id === messageId 
              ? {
                  ...msg,
                  content: 'Sorry, I had trouble generating your image. Please try again.',
                  type: 'text',
                  imageUrl: undefined
                }
              : msg
          ));
        }
      } else {
        // Regular text response
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const responseText = getAIResponse(userInput);
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: responseText,
          sender: 'ai',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, aiMessage]);
        setTypingMessage({ id: aiMessage.id, content: responseText, visibleChars: 0 });
        
        // Simulate typing effect with faster animation
        let visibleChars = 0;
        const typingSpeed = 10;
        const typingInterval = setInterval(() => {
          visibleChars += 2;
          if (visibleChars > responseText.length) {
            visibleChars = responseText.length;
          }
          setTypingMessage(prev => prev ? { ...prev, visibleChars } : null);
          
          if (visibleChars >= responseText.length) {
            clearInterval(typingInterval);
            setTypingMessage(null);
            setIsLoading(false);
          }
        }, typingSpeed);
        
        return () => clearInterval(typingInterval);
      }
    } catch (error) {
      console.error('Error processing request:', error);
      // Show error message
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, there was an error processing your request. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced AI response generator with more natural and contextual responses
  const getAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase().trim();
    const responses = {
      greeting: [
        "Hello! How can I assist you with your event today?",
        "Hi there! What kind of event are you planning?",
        "Welcome back! How can I help with your event planning?"
      ],
      eventCreation: [
        `I'd love to help you create an amazing event! Could you tell me what type of event you're planning? For example, is it a conference, workshop, or social gathering?`,
        `Event planning is exciting! Let's get started. What's the main purpose of your event? This will help me provide the best guidance.`,
        `I'm here to help bring your event to life! Could you share some details about the type of event you're organizing?`
      ],
      ticketing: [
        `I can help you set up ticketing for your event. Would you like to know about different ticket types, pricing strategies, or how to manage ticket sales?`,
        `Let's talk tickets! I can guide you through setting up different ticket tiers, early bird specials, and managing attendee registrations. What would you like to know?`,
        `For ticketing, we can set up various options like VIP passes, group discounts, or early bird specials. What kind of pricing structure are you considering?`
      ],
      promotion: [
        `Promoting your event effectively is key to its success! Have you considered which platforms you'd like to focus on? I can help with social media strategies, email campaigns, or influencer partnerships.`,
        `Let's get the word out about your event! I can suggest promotion strategies based on your target audience. Are you focusing on digital marketing, traditional media, or a mix of both?`,
        `Great question about promotion! I recommend starting with a multi-channel approach. Would you like me to outline a basic promotion timeline for your event?`
      ],
      generalHelp: [
        `I'm here to help with all aspects of event planning! You can ask me about:
• Creating and managing events
• Ticketing and registration
• Marketing and promotion
• Analytics and reporting
• Or anything else on your mind!`,
        `I can assist with:
✓ Event setup and management
✓ Ticket sales and attendee tracking
✓ Marketing strategies
✓ Budget planning
What would you like to focus on?`
      ],
      default: [
        `I'd be happy to help! Could you tell me more about what you're trying to achieve with your event?`,
        `That's an interesting question! Could you provide a bit more context so I can give you the best possible assistance?`,
        `I'm here to help! Could you rephrase your question or let me know what specific aspect of event planning you'd like to discuss?`
      ]
    };

    // Response selection logic
    const getRandomResponse = (key: keyof typeof responses) => 
      responses[key][Math.floor(Math.random() * responses[key].length)];

    if (/^(hi|hello|hey|greetings)/i.test(input)) {
      return getRandomResponse('greeting');
    } else if (/(create|organize|plan|set up).*event|event.*(create|organize|plan)/i.test(input)) {
      return getRandomResponse('eventCreation');
    } else if (/(ticket|price|cost|fee|register|rsvp)/i.test(input)) {
      return getRandomResponse('ticketing');
    } else if (/(promote|market|advertise|audience|reach|social media)/i.test(input)) {
      return getRandomResponse('promotion');
    } else if (/(help|support|assist|how to)/i.test(input)) {
      return getRandomResponse('generalHelp');
    }
    
    return getRandomResponse('default');
  };

  // FileIcon component
  const FileIcon = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );

  return (
    <div className="relative flex flex-col h-screen bg-white">
      {/* Background Image */}
      {/* Background removed for white background */}
      
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto pt-20 pb-32 px-4 md:px-8">
          <div className="max-w-3xl mx-auto w-full pb-24">
            <div className="space-y-8">
              {/* Chat messages */}
              <div className="w-full space-y-8">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${message.sender === 'user' ? 'flex items-center gap-2 bg-gray-100 text-gray-800' : ''} px-3 py-1.5 rounded-2xl`}>
                      {message.sender === 'user' && <Avatar name={message.username} />}
                      <div className="whitespace-pre-line">
                        {message.type === 'image_loading' ? (
                          <div className="shimmer-text">Creating your image...</div>
                        ) : message.type === 'image' && message.imageUrl ? (
                          <ImageMessage imageUrl={message.imageUrl} />
                        ) : (
                          <>
                            {typingMessage?.id === message.id 
                              ? message.content.substring(0, typingMessage.visibleChars)
                              : message.content}
                            {typingMessage?.id === message.id && (
                              <span className="inline-block w-1.5 h-4 bg-gray-400 ml-0.5 align-middle animate-pulse" />
                            )}
                          </>
                        )}
                        {message.sender === 'ai' && 
                         message.type !== 'image_loading' && 
                         (!typingMessage || typingMessage.id !== message.id) && (
                          <MessageActions 
                            content={message.type === 'image' ? message.imageUrl || '' : message.content}
                            isImage={message.type === 'image'}
                            onRegenerate={() => {
                              const userMessage = messages.findLast(m => m.sender === 'user');
                              if (userMessage) {
                                handleSubmit(new Event('submit'), userMessage.content);
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="animate-pulse">
                      <img 
                        src="/amptivelogo.svg" 
                        alt="Loading..." 
                        className="h-5 w-5"
                        style={{ 
                          filter: 'invert(0%) sepia(100%) saturate(0%) hue-rotate(0deg) brightness(0%) contrast(100%)',
                          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                        }}
                      />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        </main>

        {/* Fixed Input area at bottom */}
        <div className="fixed bottom-0 left-0 right-0 z-20 p-4">
          <div className="max-w-3xl mx-auto w-full">
            <form 
              onSubmit={handleSubmit}
              className="group flex flex-col gap-2 p-3 w-full rounded-3xl border border-gray-200 bg-white text-base shadow-lg transition-all duration-150 ease-in-out focus-within:border-gray-300 hover:border-gray-300 focus-within:hover:border-gray-400"
            >
              <div className="relative flex flex-col w-full">
                {renderFilePreviews()}
                <div className="relative flex-1">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={attachments.length > 0 ? 'Add a message (optional)' : 'Ask anything'}
                    maxLength={5000}
                    className="flex w-full rounded-md px-2 py-2 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 resize-none text-[16px] leading-snug placeholder-shown:text-ellipsis placeholder-shown:whitespace-nowrap md:text-base focus-visible:ring-offset-0 max-h-[200px] bg-transparent focus:bg-transparent flex-1"
                    ref={textareaRef}
                    style={{ 
                      minHeight: '80px',
                      maxHeight: '160px',
                      height: '80px',
                      overflowY: 'auto',
                      resize: 'none',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#e5e7eb transparent'
                    }}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading || isFileUploading}
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors duration-100 ease-in-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-300 disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-white shadow-sm hover:bg-gray-50 hover:border-gray-300 py-2 h-8 gap-1.5 rounded-full px-3 text-gray-800 hover:text-gray-700"
                    >
                      <Plus className="h-4 w-4 text-black" />
                      <span className="hidden md:flex">Attach</span>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuPortal>
                    <DropdownMenuContent
                      className="z-50 min-w-[180px] rounded-xl bg-white p-1 shadow-lg border border-gray-100 will-change-[opacity,transform] data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade"
                      sideOffset={5}
                      align="start"
                    >
                      <div className="space-y-1">
                        <DropdownMenuItem 
                          className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100"
                          onSelect={() => fileInputRef.current?.click()}
                        >
                          <ImageIcon className="h-4 w-4 text-gray-700" />
                          <span>Add photo and file</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100">
                          <Zap className="h-4 w-4 text-gray-700" />
                          <span>Generate Image</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100">
                          <Plus className="h-4 w-4 text-gray-700" />
                          <span>New Chat</span>
                        </DropdownMenuItem>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </DropdownMenu>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  multiple
                  disabled={isFileUploading}
                />
                <button
                  type="button"
                  className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors duration-100 ease-in-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-300 disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-white shadow-sm hover:bg-gray-50 hover:border-gray-300 py-2 h-8 gap-1.5 rounded-full px-3 text-gray-800"
                >
                  <img 
                    src="/src/assets/images-outline.svg" 
                    alt="Library" 
                    className="h-4 w-4"
                  />
                  <span className="hidden md:flex">Library</span>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors duration-100 ease-in-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-300 disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-white shadow-sm hover:bg-gray-50 hover:border-gray-300 py-2 h-8 gap-1.5 rounded-full px-3 text-gray-800 hover:text-gray-700"
                >
                  <img 
                    src="/src/assets/chatbubbles-outline.svg" 
                    alt="Chats" 
                    className="h-4 w-4"
                  />
                  <span className="hidden md:flex">Chats</span>
                </button>
                <div className="ml-auto">
                  <button
                    type="submit"
                    disabled={(attachments.length === 0 && !input.trim()) || isLoading}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-opacity duration-150 ease-out ${
                      (attachments.length === 0 && !input.trim()) || isLoading
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-black text-white cursor-pointer'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 -960 960 960" className="h-5 w-5" fill="currentColor">
                      <path d="M442.39-616.87 309.78-487.26q-11.82 11.83-27.78 11.33t-27.78-12.33q-11.83-11.83-11.83-27.78 0-15.96 11.83-27.79l198.43-199q11.83-11.82 28.35-11.82t28.35 11.82l198.43 199q11.83 11.83 11.83 27.79 0 15.95-11.83 27.78-11.82 11.83-27.78 11.83t-27.78-11.83L521.61-618.87v348.83q0 16.95-11.33 28.28-11.32 11.33-28.28 11.33t-28.28-11.33q-11.33-11.33-11.33-28.28v-348.83z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatModeWithToaster = () => {
  return (
    <>
      <ChatMode />
    </>
  );
};

export default ChatModeWithToaster;
