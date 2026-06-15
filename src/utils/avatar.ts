export const getEmojiFallback = (seed?: string | null): string => {
  const emojiSet = [
    '😀', '😎', '🤠', '🦄', '🐼', '🐸', '🐯', '🐵', '🐧', '🐰', '🐨', '🦊', '🐙', '🐳', '🐝', '🐢', '🐞', '🌸', '🌼', '🍀', '🍉', '🍓', '🍍', '⚡', '⭐', '🌙', '☀️', '🔥', '🎧', '🎨', '🎯', '🚀', '🧠', '💎', '💜', '💛', '💚', '💙', '🧸'
  ];
  
  const normalizedSeed = (seed || 'guest').toLowerCase();
  let h = 0;
  for (let i = 0; i < normalizedSeed.length; i++) {
    h = (h << 5) - h + normalizedSeed.charCodeAt(i);
    h |= 0;
  }
  const hash = Math.abs(h);
  return emojiSet[hash % emojiSet.length];
};
