

import React, { useEffect, useRef } from 'react';
import { StyleTarget, MarkerShape, LineStyle, MarkerStyle, TextStyle, BackgroundStyle, GridStyle } from '../../types';
import { HexColorPicker } from 'react-colorful';

interface StylePickerProps {
    visible: boolean;
    top: number;
    left: number;
    target: StyleTarget | null;
    currentStyle: Partial<LineStyle & MarkerStyle & TextStyle & BackgroundStyle & { grid: GridStyle }>;
    onStyleChange: (newStyle: Partial<LineStyle & MarkerStyle & TextStyle & BackgroundStyle & { grid: GridStyle }>) => void;
    onClose: () => void;
    onDragStart: (e: React.MouseEvent) => void;
}

const MARKER_SHAPES: MarkerShape[] = ['circle', 'cross', 'diamond', 'square', 'star', 'triangle', 'wye'];
const LINE_STYLES = [{name: 'Solid', value: '0'}, {name: 'Dashed', value: '5 5'}, {name: 'Dotted', value: '1 5'}];

const StylePicker: React.FC<StylePickerProps> = ({ visible, top, left, target, currentStyle, onStyleChange, onClose, onDragStart }) => {
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleInteraction = (e: MouseEvent | TouchEvent | KeyboardEvent) => {
            if (e instanceof KeyboardEvent && e.key === 'Escape') {
                onClose();
                return;
            }
             // Let the drag handle control the mousedown event
            if (e.type === 'mousedown' && (e.target as HTMLElement).closest('.drag-handle')) {
                return;
            }

            if ('target' in e && pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        if(visible) {
            document.addEventListener('mousedown', handleInteraction);
            document.addEventListener('touchstart', handleInteraction);
            document.addEventListener('keydown', handleInteraction);
        }
        return () => {
            document.removeEventListener('mousedown', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
        };
    }, [visible, onClose]);

    if (!visible || !target) return null;

    const renderColorSelector = (prop: 'color' = 'color', defaultColor = '#000000', changeHandler: (color: string) => void) => (
        <HexColorPicker 
            className="!w-full mt-1"
            color={(currentStyle as any)[prop] ?? defaultColor} 
            onChange={changeHandler}
        />
    );
    
    const renderSlider = (label: string, prop: keyof typeof currentStyle, min: number, max: number, step: number) => {
        const value = currentStyle[prop] as number ?? min;
        return (
            <div>
                 <label className="text-xs font-medium text-text-on-panel-muted flex justify-between">
                    <span>{label}</span>
                    <span>{value.toFixed(prop === 'opacity' ? 2 : 0)}</span>
                 </label>
                 <input type="range" className="w-full h-2 bg-text-on-panel-muted rounded-lg appearance-none cursor-pointer"
                    min={min} max={max} step={step} value={value}
                    onChange={e => onStyleChange({ [prop]: parseFloat(e.target.value) })}
                 />
            </div>
        );
    }

    const renderSelect = (label: string, prop: keyof typeof currentStyle, options: {name: string, value: string | MarkerShape}[], changeHandler?: (value: string) => void) => (
        <div>
            <label className="text-xs font-medium text-text-on-panel-muted">{label}</label>
            <select
                className="mt-1 block w-full py-1 text-sm border-panel-border bg-item-bg-on-panel text-on-panel-primary focus:ring-accent-pink focus:border-accent-pink rounded-md"
                value={currentStyle[prop] as string}
                onChange={e => changeHandler ? changeHandler(e.target.value) : onStyleChange({ [prop]: e.target.value })}
            >
                {options.map(o => <option key={o.value} value={o.value}>{o.name}</option>)}
            </select>
        </div>
    );

    const renderToggle = (label: string, prop: keyof TextStyle, trueValue: 'bold' | 'italic', falseValue: 'normal') => (
         <div className="flex items-center">
            <input type="checkbox" className="h-4 w-4 rounded text-accent-pink focus:ring-accent-pink bg-item-bg-on-panel border-panel-border"
                checked={currentStyle[prop] === trueValue}
                onChange={e => onStyleChange({ [prop]: e.target.checked ? trueValue : falseValue })} />
             <label className="ml-2 text-sm font-medium text-on-panel-primary">{label}</label>
        </div>
    );
    
    const renderGridOptions = () => {
        const gridStyle = currentStyle.grid || { visible: true, color: '#cccccc', strokeDasharray: '3 3' };
        return (
            <div className="space-y-3 pt-3 mt-3 border-t border-panel-border">
                <h5 className="text-xs font-bold uppercase text-center text-on-panel-secondary">Gridlines</h5>
                <div className="flex items-center">
                    <input type="checkbox" className="h-4 w-4 rounded text-accent-pink focus:ring-accent-pink bg-item-bg-on-panel border-panel-border"
                        checked={gridStyle.visible}
                        onChange={e => onStyleChange({ grid: { ...gridStyle, visible: e.target.checked } })} />
                    <label className="ml-2 text-sm font-medium text-on-panel-primary">Show Grid</label>
                </div>
                {gridStyle.visible && (
                    <>
                        <div>
                            <label className="text-xs font-medium text-text-on-panel-muted">Grid Color</label>
                            <HexColorPicker
                                className="!w-full mt-1"
                                color={gridStyle.color}
                                onChange={newColor => onStyleChange({ grid: { ...gridStyle, color: newColor } })}
                            />
                        </div>
                        {renderSelect("Grid Style", 'strokeDasharray', LINE_STYLES, (value) => onStyleChange({ grid: { ...gridStyle, strokeDasharray: value } }))}
                    </>
                )}
            </div>
        );
    }

    const targetName = `Edit ${target.replace(/([A-Z])/g, ' $1').replace('Styles', '').replace('chart ', '').trim()} Style`;

    const renderContent = () => {
        if (target === 'chartBackground') {
            return (
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-text-on-panel-muted">Background Color</label>
                        {renderColorSelector('color', '#ffffff', (newColor) => onStyleChange({ color: newColor }))}
                    </div>
                    {renderSlider("Opacity", 'opacity', 0, 1, 0.01)}
                    {renderGridOptions()}
                </div>
            )
        }
        
        return (
            <div className="space-y-3">
                {'color' in currentStyle && <div><label className="text-xs font-medium text-text-on-panel-muted">Color</label>{renderColorSelector('color', '#000000', (newColor) => onStyleChange({ color: newColor }))}</div>}
                {'opacity' in currentStyle && renderSlider("Opacity", 'opacity', 0, 1, 0.01)}
                
                {'strokeWidth' in currentStyle && renderSlider("Thickness", 'strokeWidth', 1, 10, 0.5)}
                {'strokeDasharray' in currentStyle && renderSelect("Line Style", 'strokeDasharray', LINE_STYLES)}
                
                {'shape' in currentStyle && renderSelect("Shape", 'shape', MARKER_SHAPES.map(s => ({name: s.charAt(0).toUpperCase() + s.slice(1), value: s})))}
                {'size' in currentStyle && renderSlider("Size", 'size', 2, 20, 1)}
                
                {'fontSize' in currentStyle && target !== 'groupingStyles' && renderSlider("Font Size", 'fontSize', 8, 24, 1)}
                {'fontWeight' in currentStyle && renderToggle("Bold", 'fontWeight', 'bold', 'normal')}
                {'fontStyle' in currentStyle && renderToggle("Italic", 'fontStyle', 'italic', 'normal')}

                {target === 'groupingStyles' && (
                    <div className="space-y-3 pt-3 mt-3 border-t border-panel-border">
                        <h5 className="text-xs font-bold uppercase text-center text-on-panel-secondary">Label Style</h5>
                        {renderSlider("Font Size", 'fontSize', 8, 24, 1)}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div 
            ref={pickerRef} 
            className="fixed z-50 bg-panel-bg border border-panel-border rounded-lg shadow-2xl w-64 font-sans text-on-panel-primary"
            style={{ top, left }}
            onClick={(e) => e.stopPropagation()}
        >
            <div 
                className="p-2 drag-handle" 
                style={{cursor: 'move'}}
                onMouseDown={onDragStart}
            >
                <h4 className="text-sm font-semibold text-center text-accent-blue-on-panel capitalize select-none">{targetName}</h4>
            </div>
            <div className="p-4 pt-2 space-y-4">
                 {renderContent()}
            </div>
        </div>
    );
};

export default StylePicker;