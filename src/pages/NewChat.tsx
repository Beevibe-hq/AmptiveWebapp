import React, { useState, useRef, useEffect } from 'react';
import { Plus, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const NewChat = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with empty messages and auto-scroll to bottom
  useEffect(() => {
    setMessages([]);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setIsLoading(true);
    
    // Check if user is requesting an image
    const isImageRequest = /(create|generate|make).*(image|picture|photo|art)/i.test(input);
    
    // Create the initial message
    const initialMessage = {
      id: Date.now().toString(),
      content: input,
      sender: 'user' as const,
      timestamp: new Date(),
      type: isImageRequest ? 'image_loading' as const : 'text' as const
    };
    
    // Store the message in session storage
    sessionStorage.setItem('initialMessage', JSON.stringify(initialMessage));
    
    // Navigate to chat mode
    console.log('Navigating to chat mode with initial message:', initialMessage);
    navigate('/chat-mode');
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
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors duration-100 ease-in-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-300 disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-white shadow-sm hover:bg-gray-50 hover:border-gray-300 py-2 h-8 gap-1.5 rounded-full px-3 text-gray-500 hover:text-gray-700"
                  >
                    <Plus className="h-4 w-4 text-black" />
                    <span className="hidden md:flex">Attach</span>
                  </button>
                  
                  <div className="ml-auto">
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-opacity duration-150 ease-out ${
                        !input.trim() || isLoading
                          ? 'bg-gray-300 cursor-not-allowed opacity-70'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
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
