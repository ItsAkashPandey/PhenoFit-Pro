import React, { useState, useEffect, useRef } from 'react';

interface ColorPickerProps {
    visible: boolean;
    top: number;
    left: number;
    currentColor: string;
    onColorChange: (color: string) => void;
    onClose: () => void;
    onDragStart: (e: React.MouseEvent) => void;
}

const COLORS = [
  '#000000', '#4b5563', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e', '#ffffff', '#9ca3af', '#fee2e2', '#ffedd5', '#fef3c7',
  '#fef9c3', '#ecfccb', '#dcfce7', '#d1fae5', '#ccfbf1', '#cffafe', '#dbeafe', '#e0e7ff',
  '#e5e7eb', '#e9d5ff', '#f5d0fe', '#fce7f3', '#ffe4e6'
];

const ColorPicker: React.FC<ColorPickerProps> = ({ visible, top, left, currentColor, onColorChange, onClose, onDragStart }) => {
    const [hexValue, setHexValue] = useState(currentColor);
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setHexValue(currentColor);
    }, [currentColor]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!visible) return null;

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setHexValue(e.target.value);
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
            onColorChange(e.target.value);
        }
    };

    return (
        <div
            ref={pickerRef}
            className="fixed z-50 p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl"
            style={{ top, left }}
            onMouseDown={onDragStart}
        >
            <div className="grid grid-cols-7 gap-2 mb-4">
                {COLORS.map(color => (
                    <div
                        key={color}
                        className="w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 border-2"
                        style={{ backgroundColor: color, borderColor: currentColor === color ? '#3b82f6' : 'transparent' }}
                        onClick={() => onColorChange(color)}
                    />
                ))}
            </div>
            <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full border border-gray-300" style={{ backgroundColor: currentColor }}></div>
                <input
                    type="text"
                    value={hexValue}
                    onChange={handleHexChange}
                    className="w-full px-2 py-1 border rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#RRGGBB"
                />
            </div>
            <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    );
};

export default ColorPicker;