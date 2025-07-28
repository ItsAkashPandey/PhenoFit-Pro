import React, { useState, useEffect, useRef } from 'react';
import { HexColorPicker, RgbaColorPicker, RgbaColor, HsvaColor, HsvaStringColorPicker } from 'react-colorful';
import { TinyColor } from '@ctrl/tinycolor';
import { 
    THEME_COLORS, 
    type ThemeColorKey,
    type ColorSpace,
    isValidColor,
    generatePalette,
    getAnalogousColors,
    getComplementaryColors,
    getTriadicColors,
    getSplitComplementaryColors
} from '../../services/colorUtils';

interface ModernColorPickerProps {
    visible: boolean;
    top: number;
    left: number;
    currentColor: string;
    onColorChange: (color: string) => void;
    onClose: () => void;
    onDragStart: (e: React.MouseEvent) => void;
}

const ModernColorPicker: React.FC<ModernColorPickerProps> = ({
    visible,
    top,
    left,
    currentColor,
    onColorChange,
    onClose,
    onDragStart
}) => {
    const [colorState, setColorState] = useState(() => {
        const color = isValidColor(currentColor) ? new TinyColor(currentColor) : new TinyColor('#000000');
        const hex = color.toHexString();
        return {
            hex,
            rgba: color.toRgb(),
            hsva: color.toHsv(),
            mode: 'hex' as ColorSpace,
            showCopied: false,
            palette: generatePalette(hex, 10),
            analogous: getAnalogousColors(hex),
            complementary: getComplementaryColors(hex),
            triadic: getTriadicColors(hex),
            splitComplementary: getSplitComplementaryColors(hex)
        };
    });
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isValidColor(currentColor)) return;
        
        const color = new TinyColor(currentColor);
        const hex = color.toHexString();
        setColorState(prev => ({
            ...prev,
            hex,
            rgba: color.toRgb(),
            hsva: color.toHsv(),
            palette: generatePalette(hex, 10),
            analogous: getAnalogousColors(hex),
            complementary: getComplementaryColors(hex),
            triadic: getTriadicColors(hex),
            splitComplementary: getSplitComplementaryColors(hex)
        }));
    }, [currentColor]);

    const handleColorChange = (newColor: string | RgbaColor | HsvaColor) => {
        let tinyColor: TinyColor;
        
        if (typeof newColor === 'string') {
            tinyColor = new TinyColor(newColor);
        } else if ('h' in newColor) {
            tinyColor = new TinyColor({ h: newColor.h, s: newColor.s, v: newColor.v, a: newColor.a });
        } else {
            tinyColor = new TinyColor({ r: newColor.r, g: newColor.g, b: newColor.b, a: newColor.a });
        }

        const hex = tinyColor.toHexString();
        const newState = {
            hex,
            rgba: tinyColor.toRgb(),
            hsva: tinyColor.toHsv(),
            mode: colorState.mode,
            showCopied: false,
            palette: generatePalette(hex, 10),
            analogous: getAnalogousColors(hex),
            complementary: getComplementaryColors(hex),
            triadic: getTriadicColors(hex),
            splitComplementary: getSplitComplementaryColors(hex)
        };

        setColorState(newState);
        onColorChange(getColorString(newState));
    };

    const getColorString = (state: typeof colorState) => {
        const color = new TinyColor(state.hex);
        switch (state.mode) {
            case 'rgb':
                return color.toRgbString();
            case 'hsv':
                return color.toHsvString();
            case 'hex':
            default:
                return color.toHexString();
        }
    };

    const handleCopyColor = async () => {
        try {
            const colorString = getColorString(colorState);
            await navigator.clipboard.writeText(colorString);
            setColorState(prev => ({ ...prev, showCopied: true }));
            setTimeout(() => setColorState(prev => ({ ...prev, showCopied: false })), 2000);
        } catch (err) {
            console.error('Failed to copy color code:', err);
        }
    };

    if (!visible) return null;

    return (
        <div
            ref={pickerRef}
            className="fixed z-50 bg-panel-bg border border-panel-border rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ 
                top: Math.min(top, window.innerHeight - 400),
                left: Math.min(left, window.innerWidth - 300)
            }}
        >
            <div 
                className="sticky top-0 z-10 p-2 border-b border-panel-border cursor-move bg-panel-bg"
                onMouseDown={onDragStart}
            >
                <h3 className="text-sm font-semibold text-on-panel-primary text-center">Color Picker</h3>
            </div>
            
            <div className="p-3">
                <div className="space-y-3">
                    {/* Color Preview and Input */}
                    <div className="flex space-x-2">
                        <div className="w-12 h-12 rounded-lg shadow-inner relative overflow-hidden flex-shrink-0">
                            <div 
                                className="absolute inset-0"
                                style={{ 
                                    backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==")'
                                }} 
                            />
                            <div className="absolute inset-0" style={{ backgroundColor: getColorString(colorState) }} />
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                            <input
                                type="text"
                                value={getColorString(colorState)}
                                onChange={(e) => handleColorChange(e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-panel-border rounded-md bg-white dark:bg-item-bg-on-panel text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                            />
                            <div className="flex gap-1">
                                {(['hex', 'rgb', 'hsv'] as ColorSpace[]).map(mode => (
                                    <button
                                        key={mode}
                                        className={`px-2 py-0.5 text-xs rounded ${
                                            colorState.mode === mode 
                                                ? 'bg-blue-500 text-white' 
                                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-panel-hover'
                                        }`}
                                        onClick={() => setColorState(prev => ({ ...prev, mode }))}
                                    >
                                        {mode.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div className="w-full" style={{ height: '150px' }}>
                        {colorState.mode === 'rgb' ? (
                            <RgbaColorPicker color={colorState.rgba} onChange={handleColorChange} />
                        ) : colorState.mode === 'hsv' ? (
                            <HsvaStringColorPicker 
                                color={new TinyColor(colorState.hsva).toHsvString()} 
                                onChange={handleColorChange} 
                            />
                        ) : colorState.mode === 'hex' ? (
                            <HexColorPicker color={colorState.hex} onChange={handleColorChange} />
                        ) : null}
                    </div>

                    {/* Color Palette */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">Palette</h3>
                            <button
                                onClick={handleCopyColor}
                                className="px-2 py-0.5 text-xs border border-gray-300 dark:border-panel-border rounded bg-white dark:bg-item-bg-on-panel text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                            >
                                Copy
                            </button>
                        </div>
                        <div className="grid grid-cols-10 gap-0.5">
                            {colorState.palette.map((color, index) => (
                                <button
                                    key={index}
                                    className="aspect-square hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleColorChange(color)}
                                    title={`Palette Color ${index + 1}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Theme Colors */}
                    <div>
                        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Theme Colors</h3>
                        <div className="grid grid-cols-7 gap-1">
                            {(Object.keys(THEME_COLORS) as ThemeColorKey[]).map(key => (
                                <button
                                    key={key}
                                    className="aspect-square rounded-md border border-gray-300 dark:border-panel-border hover:scale-110 transition-transform relative group"
                                    style={{
                                        backgroundColor: THEME_COLORS[key],
                                        borderColor: colorState.hex === THEME_COLORS[key] ? '#3B82F6' : undefined
                                    }}
                                    onClick={() => handleColorChange(THEME_COLORS[key])}
                                    title={key}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Color Harmonies */}
                    <div>
                        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Harmonies</h3>
                        <div className="grid grid-cols-4 gap-1">
                            <div className="space-y-1">
                                <div className="text-[10px] text-gray-400">Analogous</div>
                                <div className="flex flex-col gap-1">
                                    {colorState.analogous.slice(0, 3).map((color, index) => (
                                        <button
                                            key={index}
                                            className="aspect-square rounded-full hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                            onClick={() => handleColorChange(color)}
                                            title={`Analogous ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] text-gray-400">Complement</div>
                                <div className="flex flex-col gap-1">
                                    {colorState.complementary.map((color, index) => (
                                        <button
                                            key={index}
                                            className="aspect-square rounded-full hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                            onClick={() => handleColorChange(color)}
                                            title={`Complementary ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] text-gray-400">Triadic</div>
                                <div className="flex flex-col gap-1">
                                    {colorState.triadic.map((color, index) => (
                                        <button
                                            key={index}
                                            className="aspect-square rounded-full hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                            onClick={() => handleColorChange(color)}
                                            title={`Triadic ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] text-gray-400">Split</div>
                                <div className="flex flex-col gap-1">
                                    {colorState.splitComplementary.map((color, index) => (
                                        <button
                                            key={index}
                                            className="aspect-square rounded-full hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                            onClick={() => handleColorChange(color)}
                                            title={`Split ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Copied Notification */}
            {colorState.showCopied && (
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 px-3 py-1.5 text-xs text-white bg-blue-500 rounded-full shadow-lg">
                    Copied!
                </div>
            )}

            {/* Close Button */}
            <button 
                onClick={onClose}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-panel-hover"
            >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

export default ModernColorPicker;
