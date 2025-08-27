import { useEffect, useState } from 'react';

type Placeholder = {
  text: string;
  prefix: string;
};

const placeholders: Placeholder[] = [
  { text: 'Create a modern poster for my music festival', prefix: '' },
  { text: 'Design a cover for my new audio show about technology', prefix: '' },
  { text: 'Make a flyer for my food truck event this weekend', prefix: '' },
  { text: 'Generate a banner for my online workshop', prefix: '' },
];

interface TypingPlaceholderProps {
  onTypingComplete?: () => void;
  isFocused: boolean;
}

export const TypingPlaceholder = ({ onTypingComplete, isFocused }: TypingPlaceholderProps) => {
  const [displayText, setDisplayText] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingPaused, setTypingPaused] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (isFocused) {
      setDisplayText('');
      setTypingPaused(true);
      return;
    }
    
    setTypingPaused(false);
    
    const currentPlaceholder = placeholders[placeholderIndex];
    const fullText = `${currentPlaceholder.prefix} ${currentPlaceholder.text}...`;
    
    let timeout: NodeJS.Timeout;
    
    if (!typingPaused) {
      if (isDeleting) {
        // Deleting text
        timeout = setTimeout(() => {
          setDisplayText(fullText.substring(0, charIndex - 1));
          setCharIndex(charIndex - 1);
          
          if (charIndex === 0) {
            // Move to next placeholder
            setIsDeleting(false);
            setPlaceholderIndex((placeholderIndex + 1) % placeholders.length);
          }
        }, 50);
      } else {
        // Typing text
        timeout = setTimeout(() => {
          setDisplayText(fullText.substring(0, charIndex + 1));
          setCharIndex(charIndex + 1);
          
          if (charIndex === fullText.length) {
            // Pause at the end of typing
            setTimeout(() => {
              setIsDeleting(true);
            }, 2000); // Pause for 2 seconds before deleting
          }
        }, 100);
      }
    }
    
    // Cursor blink effect
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    
    return () => {
      clearTimeout(timeout);
      clearInterval(cursorInterval);
    };
  }, [charIndex, isDeleting, placeholderIndex, isFocused, typingPaused]);

  return (
    <span className="text-gray-500 font-medium">
      {displayText}
      <span className={`inline-block w-1 h-5 bg-gray-500 ml-0.5 ${!showCursor || isFocused ? 'opacity-0' : 'opacity-100'}`}>
        &nbsp;
      </span>
    </span>
  );
};

export default TypingPlaceholder;
