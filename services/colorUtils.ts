
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
