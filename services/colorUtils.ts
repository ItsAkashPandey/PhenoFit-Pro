export const COLOR_MAP: { [key: string]: string } = {
    "red": "#FF0000",
    "green": "#008000",
    "blue": "#0000FF",
    "yellow": "#FFFF00",
    "black": "#000000",
    "white": "#FFFFFF",
    "lightblue": "#ADD8E6",
    "gray": "#808080",
    "darkgray": "#A9A9A9",
    "lightgray": "#D3D3D3",
    "orange": "#FFA500",
    "purple": "#800080",
    "pink": "#FFC0CB",
    "brown": "#A52A2A",
    "cyan": "#00FFFF",
    "magenta": "#FF00FF",
    "lime": "#00FF00",
    "teal": "#008080",
    "indigo": "#4B0082",
    "violet": "#EE82EE",
    "gold": "#FFD700",
    "silver": "#C0C0C0",
    "maroon": "#800000",
    "olive": "#808000",
    "navy": "#000080",
    "turquoise": "#40E0D0",
    "coral": "#FF7F50",
    "chocolate": "#D2691E",
    "crimson": "#DC143C",
    "fuchsia": "#FF00FF",
    "khaki": "#F0E68C",
    "lavender": "#E6E6FA",
    "plum": "#DDA0DD",
    "salmon": "#FA8072",
    "sienna": "#A0522D",
    "skyblue": "#87CEEB",
    "tan": "#D2B48C",
    "thistle": "#D8BFD8",
    "tomato": "#FF6347",
    "wheat": "#F5DEB3",
    "tortoise": "#81613C",
};

// Type definitions for color utilities
export type ColorSpace = 'hex' | 'rgb' | 'hsl' | 'hsv';
export type ThemeColorKey = 'primary' | 'secondary' | 'accent' | 'neutral';

// Theme colors for the application
export const THEME_COLORS = {
    primary: '#3B82F6',
    secondary: '#6B7280',
    accent: '#10B981',
    neutral: '#374151',
    danger: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    info: '#3B82F6'
};

// Data visualization color palette
export const DATA_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

export const getColorHex = (colorName: string): string | undefined => {
    return COLOR_MAP[colorName.toLowerCase()];
};

export const toHex = (color: string): string => {
    const namedColorHex = getColorHex(color);
    if (namedColorHex) {
        return namedColorHex;
    }

    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) {
        return '#000000'; // Fallback
    }
    ctx.fillStyle = color;
    const hexResult = ctx.fillStyle;
    return hexResult;
};

// A utility to convert a color string (hex, rgb, or name) and an opacity value into an RGBA string.
export const toRgba = (color: string, opacity: number = 1): string => {
    // First, convert any color input to a canonical hex format
    const hexColor = toHex(color);

    let r = 0, g = 0, b = 0;

    // Parse the hex color to get RGB components
    if (hexColor.length === 4) { // Shorthand hex (e.g., #03F)
        r = parseInt(hexColor[1] + hexColor[1], 16);
        g = parseInt(hexColor[2] + hexColor[2], 16);
        b = parseInt(hexColor[3] + hexColor[3], 16);
    } else if (hexColor.length === 7) { // Full hex (e.g., #0033FF)
        r = parseInt(hexColor.substring(1, 3), 16);
        g = parseInt(hexColor.substring(3, 5), 16);
        b = parseInt(hexColor.substring(5, 7), 16);
    } else { // Fallback for invalid hex or other unexpected formats after toHex
        return `rgba(0, 0, 0, ${opacity})`;
    }

    const rgbaResult = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    return rgbaResult;
};

// Validate if a color string is valid
export const isValidColor = (color: string): boolean => {
    try {
        const hex = toHex(color);
        return /^#[0-9A-F]{6}$/i.test(hex);
    } catch {
        return false;
    }
};

// Convert color between different formats
export const convertColor = (color: string, targetSpace: ColorSpace): string => {
    const hex = toHex(color);
    
    switch (targetSpace) {
        case 'hex':
            return hex;
        case 'rgb':
            const r = parseInt(hex.substring(1, 3), 16);
            const g = parseInt(hex.substring(3, 5), 16);
            const b = parseInt(hex.substring(5, 7), 16);
            return `rgb(${r}, ${g}, ${b})`;
        case 'hsl':
        case 'hsv':
            // Simplified conversion - would need more complex math for full implementation
            return hex;
        default:
            return hex;
    }
};

// Get color information
export const getColorInfo = (color: string) => {
    const hex = toHex(color);
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    
    // Calculate brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    return {
        hex,
        rgb: { r, g, b },
        brightness,
        isDark: brightness < 128
    };
};

// Generate a color palette
export const generatePalette = (baseColor: string, count: number = 5): string[] => {
    const colors: string[] = [];
    const info = getColorInfo(baseColor);
    
    for (let i = 0; i < count; i++) {
        const factor = (i + 1) / (count + 1);
        const r = Math.round(info.rgb.r * factor);
        const g = Math.round(info.rgb.g * factor);
        const b = Math.round(info.rgb.b * factor);
        colors.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
    }
    
    return colors;
};

// Get analogous colors
export const getAnalogousColors = (color: string): string[] => {
    // Simplified implementation - would need HSL conversion for proper analogous colors
    return generatePalette(color, 3);
};

// Get complementary colors
export const getComplementaryColors = (color: string): string[] => {
    const info = getColorInfo(color);
    const compR = 255 - info.rgb.r;
    const compG = 255 - info.rgb.g;
    const compB = 255 - info.rgb.b;
    
    const complementary = `#${compR.toString(16).padStart(2, '0')}${compG.toString(16).padStart(2, '0')}${compB.toString(16).padStart(2, '0')}`;
    return [color, complementary];
};

// Get triadic colors
export const getTriadicColors = (color: string): string[] => {
    // Simplified implementation
    return generatePalette(color, 3);
};

// Get split complementary colors
export const getSplitComplementaryColors = (color: string): string[] => {
    // Simplified implementation
    return generatePalette(color, 3);
};
