import React, { useState } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { motion, AnimatePresence } from 'framer-motion';
import { HexColorPicker, RgbaColorPicker, HsvaStringColorPicker } from 'react-colorful';
import { TinyColor } from '@ctrl/tinycolor';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { 
    THEME_COLORS, 
    type ColorSpace,
    isValidColor,
    generatePalette,
} from '../../services/colorUtils';

interface StyleEditorProps {
    visible: boolean;
    top: number;
    left: number;
    currentColor: string;
    onColorChange: (color: string) => void;
    onClose: () => void;
    onDragStart: (e: React.MouseEvent) => void;
}

type Section = 'picker' | 'adjustments' | 'presets';

const StyleEditor: React.FC<StyleEditorProps> = ({
    visible,
    top,
    left,
    currentColor,
    onColorChange,
    onClose,
    onDragStart
}) => {
    // State
    const [expandedSections, setExpandedSections] = useState<Section[]>(['picker']);
    const [colorState, setColorState] = useState(() => {
        const color = isValidColor(currentColor) ? new TinyColor(currentColor) : new TinyColor('#000000');
        return {
            hex: color.toHexString(),
            rgba: color.toRgb(),
            hsva: color.toHsv(),
            mode: 'hex' as ColorSpace,
            palette: generatePalette(color.toHexString(), 10)
        };
    });

    // Handlers
    const toggleSection = (section: Section) => {
        setExpandedSections(prev => 
            prev.includes(section) 
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    const handleColorChange = (newColor: string | any) => {
        const tinyColor = typeof newColor === 'string' 
            ? new TinyColor(newColor)
            : 'h' in newColor 
                ? new TinyColor({ h: newColor.h, s: newColor.s, v: newColor.v, a: newColor.a })
                : new TinyColor({ r: newColor.r, g: newColor.g, b: newColor.b, a: newColor.a });

        const hex = tinyColor.toHexString();
        const newState = {
            hex,
            rgba: tinyColor.toRgb(),
            hsva: tinyColor.toHsv(),
            mode: colorState.mode,
            palette: generatePalette(hex, 10)
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
            default:
                return color.toHexString();
        }
    };

    if (!visible) return null;

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.color-picker-area')) {
            e.stopPropagation();
            return;
        }
        onDragStart(e);
    };

    return (
        <div
            className="fixed z-50 w-[300px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col"
            style={{ 
                top: Math.max(10, Math.min(top, window.innerHeight - 400)), 
                left: Math.max(10, Math.min(left, window.innerWidth - 320)),
                maxHeight: 'calc(100vh - 20px)'
            }}
        >
            {/* Header */}
            <div 
                className="p-3 border-b border-gray-200 dark:border-gray-700 cursor-move flex items-center justify-between"
                onMouseDown={handleMouseDown}
            >
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Style Editor</h3>
                <button 
                    onClick={onClose}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* Color Picker Section */}
                <Collapsible.Root 
                    open={expandedSections.includes('picker')}
                    onOpenChange={() => toggleSection('picker')}
                >
                    <Collapsible.Trigger className="w-full flex items-center justify-between p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md">
                        <span>Color</span>
                        {expandedSections.includes('picker') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </Collapsible.Trigger>
                    <AnimatePresence>
                        {expandedSections.includes('picker') && (
                            <Collapsible.Content asChild forceMount>
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-2 space-y-3">
                                        {/* Color Input */}
                                        <div className="flex items-center space-x-2">
                                            <div
                                                className="w-10 h-10 rounded-md border border-gray-200 dark:border-gray-600"
                                                style={{ backgroundColor: getColorString(colorState) }}
                                            />
                                            <input
                                                type="text"
                                                value={getColorString(colorState)}
                                                onChange={(e) => handleColorChange(e.target.value)}
                                                className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                                            />
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

                                        {/* Color Picker */}
                                        <div className="color-picker-area w-full" style={{ height: '150px' }}>
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
                                    </div>
                                </motion.div>
                            </Collapsible.Content>
                        )}
                    </AnimatePresence>
                </Collapsible.Root>

                {/* Color Adjustments Section */}
                <Collapsible.Root 
                    open={expandedSections.includes('adjustments')}
                    onOpenChange={() => toggleSection('adjustments')}
                >
                    <Collapsible.Trigger className="w-full flex items-center justify-between p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md">
                        <span>Adjustments</span>
                        {expandedSections.includes('adjustments') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </Collapsible.Trigger>
                    <AnimatePresence>
                        {expandedSections.includes('adjustments') && (
                            <Collapsible.Content asChild forceMount>
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-2 space-y-3">
                                        {/* Opacity Slider */}
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                                                <span>Opacity</span>
                                                <span>{Math.round(colorState.rgba.a * 100)}%</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.01"
                                                value={colorState.rgba.a}
                                                onChange={(e) => handleColorChange({
                                                    ...colorState.rgba,
                                                    a: parseFloat(e.target.value)
                                                })}
                                                className="w-full"
                                            />
                                        </div>

                                        {/* Shade Palette */}
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Shades</label>
                                            <div className="grid grid-cols-10 gap-1">
                                                {colorState.palette.map((color, index) => (
                                                    <button
                                                        key={index}
                                                        className="aspect-square rounded-sm hover:scale-110 transition-transform"
                                                        style={{ backgroundColor: color }}
                                                        onClick={() => handleColorChange(color)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </Collapsible.Content>
                        )}
                    </AnimatePresence>
                </Collapsible.Root>

                {/* Preset Colors Section */}
                <Collapsible.Root 
                    open={expandedSections.includes('presets')}
                    onOpenChange={() => toggleSection('presets')}
                >
                    <Collapsible.Trigger className="w-full flex items-center justify-between p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md">
                        <span>Preset Colors</span>
                        {expandedSections.includes('presets') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </Collapsible.Trigger>
                    <AnimatePresence>
                        {expandedSections.includes('presets') && (
                            <Collapsible.Content asChild forceMount>
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-2 space-y-3">
                                        <div className="grid grid-cols-8 gap-1">
                                            {Object.entries(THEME_COLORS).map(([key, color]) => (
                                                <button
                                                    key={key}
                                                    className="aspect-square rounded-md hover:scale-110 transition-transform relative group"
                                                    style={{ backgroundColor: color }}
                                                    onClick={() => handleColorChange(color)}
                                                    title={key}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            </Collapsible.Content>
                        )}
                    </AnimatePresence>
                </Collapsible.Root>
            </div>
        </div>
    );
};

export default StyleEditor;
