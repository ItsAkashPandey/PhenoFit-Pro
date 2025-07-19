import React, { useEffect, useRef } from 'react';
import { ColorPickerState } from '../../types';

interface ColorPickerProps {
    state: ColorPickerState;
    onClose: () => void;
}

const COLORS = [
  '#000000', '#4b5563', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e', '#ffffff', '#9ca3af', '#fee2e2', '#ffedd5', '#fef3c7',
  '#fef9c3', '#ecfccb', '#dcfce7', '#d1fae5', '#ccfbf1', '#cffafe', '#dbeafe', '#e0e7ff',
  '#e5e7eb', '#e9d5ff', '#f5d0fe', '#fce7f3', '#ffe4e6'
];

const ColorPicker: React.FC<ColorPickerProps> = ({ state, onClose }) => {
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!state.visible) return null;

    const handleColorSelect = (color: string) => {
        state.onColorSelect(color);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-40" onClick={onClose}>
            <div
                ref={pickerRef}
                className="fixed z-50 p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl"
                style={{ top: state.top, left: state.left }}
                onClick={(e) => e.stopPropagation()} // Prevent backdrop click from firing
            >
                <div className="grid grid-cols-7 gap-2">
                    {COLORS.map(color => (
                        <div
                            key={color}
                            className="w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 border border-gray-200 dark:border-gray-700"
                            style={{ backgroundColor: color }}
                            onClick={() => handleColorSelect(color)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ColorPicker;
