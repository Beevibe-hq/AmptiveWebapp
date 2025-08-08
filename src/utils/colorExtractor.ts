interface RGB {
  r: number;
  g: number;
  b: number;
}

export const extractDominantColors = (imageUrl: string, count: number = 2): Promise<string[]> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(['#1E3A8A', '#3B82F6']); // Fallback colors
      
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0, img.width, img.height);
      
      try {
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        // Sample colors from the image
        const colorCounts: { [key: string]: number } = {};
        const sampleSize = 1000; // Number of pixels to sample
        const step = Math.max(1, Math.floor((img.width * img.height) / sampleSize));
        
        for (let i = 0; i < pixels.length; i += 4 * step) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          
          // Skip transparent/very light pixels
          if (pixels[i + 3] < 128) continue;
          
          // Convert to hex
          const hex = rgbToHex(r, g, b);
          
          // Count color occurrences
          colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }
        
        // Sort colors by occurrence and pick the most dominant ones
        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, count)
          .map(([color]) => color);
        
        // If we didn't get enough colors, fill with fallback
        while (sortedColors.length < count) {
          sortedColors.push('#1E3A8A');
        }
        
        resolve(sortedColors);
      } catch (e) {
        console.error('Error extracting colors:', e);
        resolve(['#1E3A8A', '#3B82F6']); // Fallback colors
      }
    };
    
    img.onerror = () => {
      resolve(['#1E3A8A', '#3B82F6']); // Fallback colors on error
    };
  });
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};
