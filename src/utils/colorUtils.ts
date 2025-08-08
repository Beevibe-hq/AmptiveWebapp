export const getDominantColor = (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // Set canvas dimensions to match the image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw the image on the canvas
        ctx.drawImage(img, 0, 0, img.width, img.height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Count color occurrences
        const colorCount: { [key: string]: number } = {};
        
        // Sample pixels to improve performance
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          // Skip transparent/semi-transparent pixels
          if (a < 128) continue;
          
          const color = `${r},${g},${b}`;
          colorCount[color] = (colorCount[color] || 0) + 1;
        }

        // Find the most common color
        let maxCount = 0;
        let dominantColor = '255,255,255'; // Default to white if no color found
        
        for (const [color, count] of Object.entries(colorCount)) {
          if (count > maxCount) {
            maxCount = count;
            dominantColor = color;
          }
        }

        // Convert to hex
        const [r, g, b] = dominantColor.split(',').map(Number);
        const toHex = (c: number) => c.toString(16).padStart(2, '0');
        const hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        
        resolve(hexColor);
      } catch (error) {
        console.error('Error extracting dominant color:', error);
        reject('#FFFFFF'); // Fallback to white
      }
    };

    img.onerror = () => {
      console.error('Error loading image for color extraction');
      reject('#FFFFFF'); // Fallback to white
    };
  });
};

export const generateGradient = (baseColor: string): string => {
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };

  // Convert RGB to hex
  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  };

  // Lighten color
  const lightenColor = (color: string, percent: number) => {
    const { r, g, b } = hexToRgb(color);
    const amount = Math.round(2.55 * percent);
    const newR = Math.min(255, r + amount);
    const newG = Math.min(255, g + amount);
    const newB = Math.min(255, b + amount);
    return rgbToHex(newR, newG, newB);
  };

  // Darken color
  const darkenColor = (color: string, percent: number) => {
    const { r, g, b } = hexToRgb(color);
    const amount = Math.round(2.55 * percent);
    const newR = Math.max(0, r - amount);
    const newG = Math.max(0, g - amount);
    const newB = Math.max(0, b - amount);
    return rgbToHex(newR, newG, newB);
  };

  // Generate gradient colors
  const color1 = darkenColor(baseColor, 20);
  const color2 = baseColor;
  const color3 = lightenColor(baseColor, 20);

  return `linear-gradient(135deg, ${color1} 0%, ${color2} 50%, ${color3} 100%)`;
};
