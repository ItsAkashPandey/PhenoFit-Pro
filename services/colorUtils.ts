<<<<<<< Updated upstream

// A utility to convert a color string (hex, rgb, or name) and an opacity value into an RGBA string.
export const toRgba = (color: string, opacity: number = 1): string => {
    if (color.startsWith('rgba')) {
        // If it's already RGBA, just update the alpha value
        return color.replace(/,s*[0-9.]+s*\)$/, `, ${opacity})`);
    }

    if (color.startsWith('rgb')) {
        return `rgba(${color.substring(4, color.length - 1)}, ${opacity})`;
    }

    if (color.startsWith('#')) {
        let r = 0, g = 0, b = 0;
        // Handle shorthand hex (e.g., #03F)
        if (color.length === 4) {
            r = parseInt(color[1] + color[1], 16);
            g = parseInt(color[2] + color[2], 16);
            b = parseInt(color[3] + color[3], 16);
        } else if (color.length === 7) {
            r = parseInt(color.substring(1, 3), 16);
            g = parseInt(color.substring(3, 5), 16);
            b = parseInt(color.substring(5, 7), 16);
        }
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // For color names, we need a canvas context to parse them.
    // This will work in any browser environment.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        // Fallback for non-browser environments, though this app is browser-based.
        return `rgba(0, 0, 0, ${opacity})`;
    }
    ctx.fillStyle = color;
    // The browser converts the color name to an RGB/RGBA value.
    // We parse that value to get the R, G, B components.
    const computedColor = ctx.fillStyle;
    if (computedColor.startsWith('#')) {
        return toRgba(computedColor, opacity); // Recurse with the hex value
    }
    // For "rgb(r, g, b)" format
    const match = computedColor.match(/(\d+)/g);
    if (match && match.length >= 3) {
        const [r, g, b] = match.map(Number);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // Fallback if color name is invalid
    return `rgba(0, 0, 0, ${opacity})`;
};
=======
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
>>>>>>> Stashed changes
