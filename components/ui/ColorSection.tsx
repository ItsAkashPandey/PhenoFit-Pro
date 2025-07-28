import React from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { motion, AnimatePresence } from 'framer-motion';
import { HexColorPicker, RgbaColorPicker, HsvaStringColorPicker } from 'react-colorful';
import { TinyColor } from '@ctrl/tinycolor';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { 
    type ColorSpace,
    isValidColor,
} from '../../services/colorUtils';

interface ColorSectionProps {
    isExpanded: boolean;
    onToggle: () => void;
    currentColor: string;
    onColorChange: (color: string) => void;
}

const ColorSection: React.FC<ColorSectionProps> = ({
    isExpanded,
    onToggle,
    currentColor,
    onColorChange
}) => {
    const [colorState, setColorState] = React.useState(() => {
        const color = isValidColor(currentColor) ? new TinyColor(currentColor) : new TinyColor('#000000');
        return {
            hex: color.toHexString(),
            rgba: color.toRgb(),
            hsva: color.toHsv(),
            mode: 'hex' as ColorSpace
        };
    });

    React.useEffect(() => {
        if (currentColor !== colorState.hex) {
            const color = isValidColor(currentColor) ? new TinyColor(currentColor) : new TinyColor('#000000');
            setColorState(prev => ({
                ...prev,
                hex: color.toHexString(),
                rgba: color.toRgb(),
                hsva: color.toHsv()
            }));
        }
    }, [currentColor]);

    const handleColorChange = (newColor: string | any) => {
        const tinyColor = typeof newColor === 'string' 
            ? new TinyColor(newColor)
            : 'h' in newColor 
                ? new TinyColor({ h: newColor.h, s: newColor.s, v: newColor.v, a: newColor.a })
                : new TinyColor({ r: newColor.r, g: newColor.g, b: newColor.b, a: newColor.a });

        if (!tinyColor.isValid) return;

        const hex = tinyColor.toHexString();
        const newState = {
            hex,
            rgba: tinyColor.toRgb(),
            hsva: tinyColor.toHsv(),
            mode: colorState.mode
        };

        setColorState(newState);
        
        // Always return color with alpha channel
        if (typeof newColor === 'object' && 'a' in newColor) {
            onColorChange(tinyColor.toRgbString());
        } else {
            const currentAlpha = colorState.rgba.a;
            onColorChange(new TinyColor(tinyColor.toRgb()).setAlpha(currentAlpha).toRgbString());
        }
    };

    const getColorString = (state: typeof colorState) => {
        const color = new TinyColor(state.hex);
        switch (state.mode) {
            case 'rgb':
                return color.toRgbString();
            case 'hsv':
                return color.toHsvString();
            default:
                return color.toHexString();
        }
    };

    return (
        <Collapsible.Root open={isExpanded} onOpenChange={onToggle}>
            <Collapsible.Trigger className="w-full flex items-center justify-between p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md">
                <div className="flex items-center space-x-2">
                    <div 
                        className="w-4 h-4 rounded border border-gray-200 dark:border-gray-600" 
                        style={{ backgroundColor: getColorString(colorState) }}
                    />
                    <span>{getColorString(colorState)}</span>
                </div>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Collapsible.Trigger>

            <AnimatePresence>
                {isExpanded && (
                    <Collapsible.Content asChild forceMount>
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="p-2 space-y-4">
                                {/* Color Picker */}
                                <div className="color-picker-area" style={{ height: '150px', position: 'relative', zIndex: 10 }}>
                                    {colorState.mode === 'rgb' ? (
                                        <RgbaColorPicker color={colorState.rgba} onChange={handleColorChange} />
                                    ) : colorState.mode === 'hsv' ? (
                                        <HsvaStringColorPicker 
                                            color={new TinyColor(colorState.hsva).toHsvString()} 
                                            onChange={handleColorChange} 
                                        />
                                    ) : (
                                        <HexColorPicker color={colorState.hex} onChange={handleColorChange} />
                                    )}
                                </div>

                                {/* Color Mode Selector */}
                                <div className="flex gap-1">
                                    {(['hex', 'rgb', 'hsv'] as ColorSpace[]).map(mode => (
                                        <button
                                            key={mode}
                                            className={`px-2 py-1 text-xs rounded ${
                                                colorState.mode === mode 
                                                    ? 'bg-blue-500 text-white' 
                                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                            onClick={() => setColorState(prev => ({ ...prev, mode }))}
                                        >
                                            {mode.toUpperCase()}
                                        </button>
                                    ))}
                                </div>

                                {/* Color Input */}
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={getColorString(colorState)}
                                        onChange={(e) => handleColorChange(e.target.value)}
                                        className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                                    />
                                </div>

                                {/* Opacity Slider */}
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                                        <span>Color Opacity</span>
                                        <span>{Math.round(colorState.rgba.a * 100)}%</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={colorState.rgba.a}
                                        onChange={(e) => {
                            const newAlpha = parseFloat(e.target.value);
                            setColorState(prev => ({
                                ...prev,
                                rgba: { ...prev.rgba, a: newAlpha },
                                hsva: { ...prev.hsva, a: newAlpha }
                            }));
                            const tinyColor = new TinyColor(colorState.rgba);
                            onColorChange(tinyColor.setAlpha(newAlpha).toRgbString());
                        }}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </Collapsible.Content>
                )}
            </AnimatePresence>
        </Collapsible.Root>
    );
};

export default ColorSection;
