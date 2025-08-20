import React, { useState, useRef, useEffect } from 'react';
import { Plus, Image as ImageIcon, Zap, Loader2 } from 'lucide-react';
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

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const NewChat = () => {
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
  const [isInputFocused, setIsInputFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [placeholderText] = useState('Message AI...');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Handle file upload logic here
    }
  };
  
  const renderFilePreview = () => {
    if (!selectedFile) return null;
    
    if (selectedFile.type.startsWith('image/')) {
      return (
        <div className="mt-2 p-2 border rounded-lg">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm truncate">{selectedFile.name}</span>
          </div>
        </div>
      );
    }
    
    return (
      <div className="mt-2 p-2 border rounded-lg">
        <div className="flex items-center gap-2">
          <FileIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm truncate">{selectedFile.name}</span>
        </div>
      </div>
    );
  };

  const fileUploadRef = useRef<HTMLDivElement>(null);

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
      if (input.trim() && !isLoading) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Add AI response
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: getAIResponse(input),
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error getting AI response:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Simple response generator (in a real app, this would call an AI API)
  const getAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('event') || input.includes('create') || input.includes('organize')) {
      return 'I can help you create an amazing event! What type of event are you planning? You can choose from concerts, conferences, workshops, or any other type of gathering.';
    } else if (input.includes('ticket') || input.includes('price') || input.includes('cost')) {
      return 'You can set up ticketing for your event through our platform. Would you like me to guide you through the process of creating tickets and setting prices?';
    } else if (input.includes('promote') || input.includes('market') || input.includes('audience')) {
      return 'To promote your event effectively, consider these strategies:\n1. Share on social media\n2. Create engaging content\n3. Use email marketing\n4. Collaborate with influencers\nWould you like more details on any of these?';
    } else if (input.includes('help') || input.includes('support')) {
      return 'I\'m here to help! You can ask me about:\n- Creating and managing events\n- Selling tickets\n- Promoting your event\n- Analytics and reporting\n- Any other questions you might have';
    } else {
      return 'I\'m here to help you with your event planning needs. You can ask me about creating events, selling tickets, promoting your event, or any other questions you might have!';
    }
  };

  return (
    <div className="relative flex h-screen bg-gray-50">
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
              <div className="text-3xl sm:text-4xl font-semibold leading-tight">
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
              <form 
                onSubmit={handleSubmit} 
                className="group flex flex-col gap-2 p-3 w-full rounded-3xl border border-gray-200 bg-white text-base shadow-lg transition-all duration-150 ease-in-out focus-within:border-gray-300 hover:border-gray-300 focus-within:hover:border-gray-400"
              >
                <div className="relative flex flex-1 items-center">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me to create a cover image for your event..."
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
                    disabled={isLoading}
                  />
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors duration-100 ease-in-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-300 disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-white shadow-sm hover:bg-gray-50 hover:border-gray-300 py-2 h-8 gap-1.5 rounded-full px-3 text-gray-500 hover:text-gray-700"
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
                  />
                  <button
                    type="button"
                    className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors duration-100 ease-in-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-300 disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-white shadow-sm hover:bg-gray-50 hover:border-gray-300 py-2 h-8 gap-1.5 rounded-full px-3 text-gray-500 hover:text-gray-700"
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
                    className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors duration-100 ease-in-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-300 disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-white shadow-sm hover:bg-gray-50 hover:border-gray-300 py-2 h-8 gap-1.5 rounded-full px-3 text-gray-500 hover:text-gray-700"
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
                      disabled={!input.trim() || isLoading}
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-opacity duration-150 ease-out ${
                      !input.trim() || isLoading
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
        </main>
        </div>
      </div>
    </div>
  );
};

export default NewChat;
