import React, { createContext, useContext, useState, ReactNode } from 'react';

type RGB = { r: number; g: number; b: number };

interface ThemeContextType {
    dominantColor: RGB | null;
    setDominantColor: (color: RGB | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [dominantColor, setDominantColor] = useState<RGB | null>(null);

    return (
        <ThemeContext.Provider value={{ dominantColor, setDominantColor }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
