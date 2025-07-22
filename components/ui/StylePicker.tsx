import React, { useState } from 'react';
import { StylePickerState, StyleTarget, LineStyle, MarkerStyle, TextStyle, BackgroundStyle, GridStyle, LegendStyle, MarkerShape } from '../../types';
import { HexColorPicker } from 'react-colorful';
import ParameterSlider from './ParameterSlider';
import Select from './Select';
import ColorPicker from './ColorPicker';

const LINE_STYLES = [
    { name: 'Solid', value: '0' }, { name: 'Dashed', value: '5 5' }, { name: 'Dotted', value: '1 5' },
];

const MARKER_SHAPES: {name: string, value: MarkerShape}[] = [
    { name: 'Circle', value: 'circle' }, { name: 'Plus', value: 'cross' }, { name: 'Cross', value: 'x' }, { name: 'Diamond', value: 'diamond' },
    { name: 'Square', value: 'square' }, { name: 'Star', value: 'star' }, { name: 'Triangle', value: 'triangle' }, { name: 'Wye', value: 'wye' },
];

type StyleChangeHandler = (newStyle: Partial<LineStyle & MarkerStyle & TextStyle & BackgroundStyle & LegendStyle & { grid: GridStyle }>) => void;

interface StylePickerProps extends StylePickerState {
    onStyleChange: StyleChangeHandler;
    onClose: () => void;
    onDragStart: (e: React.MouseEvent) => void;
    xAxisLabel: string;
    yAxisLabel: string;
    setXAxisLabel: (label: string) => void;
    setYAxisLabel: (label: string) => void;
}

const StylePicker: React.FC<StylePickerProps> = ({ visible, top, left, target, currentStyle, onStyleChange, onClose, onDragStart, xAxisLabel, yAxisLabel, setXAxisLabel, setYAxisLabel }) => {
    const pickerRef = React.useRef<HTMLDivElement>(null);
    const [openSection, setOpenSection] = useState<string>('');
    const [sectionEnabled, setSectionEnabled] = useState<{[key: string]: boolean}>({});

    // --- Fix: activeTab must be a valid tab for the current target ---
    // Define tab keys for each target
    const tabKeysByTarget: { [key: string]: string[] } = {
      legend: ['layout', 'colors'],
      xAxis: ['label', 'style'],
      yAxis: ['label', 'style'],
      chartBackground: ['color', 'grid'],
      observed: ['marker', 'style'],
      outliers: ['marker', 'style'],
      pendingOutliers: ['marker', 'style'],
      fitted: ['line', 'style'],
      groupingStyles: ['line', 'text', 'style'],
    };
    // Pick the first tab for the current target, or fallback to 'layout'
    const safeTarget = typeof target === 'string' ? target : '';
    const defaultTab = (safeTarget && tabKeysByTarget[safeTarget] && tabKeysByTarget[safeTarget][0]) || 'layout';
    const [activeTab, setActiveTab] = useState<string>(defaultTab);
    // Reset activeTab when target changes
    React.useEffect(() => {
      const safeTarget = typeof target === 'string' ? target : '';
      setActiveTab((tabKeysByTarget[safeTarget] && tabKeysByTarget[safeTarget][0]) || 'layout');
    }, [target]);

    React.useEffect(() => {
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
                 <label className="text-xs font-medium text-on-panel-muted flex justify-between">
                    <span>{label}</span>
                    <span>{value.toFixed(prop === 'opacity' ? 2 : 0)}</span>
                 </label>
                 <input type="range" className="w-full h-2 bg-on-panel-muted rounded-lg appearance-none cursor-pointer"
                    min={min} max={max} step={step} value={value}
                    onChange={e => onStyleChange({ [prop]: parseFloat(e.target.value) })}
                 />
            </div>
        );
    }

    const renderSelect = (label: string, prop: keyof typeof currentStyle, options: {name: string, value: string | MarkerShape}[], changeHandler?: (value: string) => void) => (
        <div>
            <label className="text-xs font-medium text-on-panel-muted">{label}</label>
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
                            <label className="text-xs font-medium text-on-panel-muted">Grid Color</label>
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

    const Collapsible = ({ title, sectionKey, children }: { title: string, sectionKey: string, children: React.ReactNode }) => (
        <div className="mb-2">
            <button
                className="w-full text-left font-bold py-1 px-2 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none"
                onClick={() => setOpenSection(openSection === sectionKey ? '' : sectionKey)}
            >
                {title}
            </button>
            {openSection === sectionKey && (
                <div className="mt-2 pl-2 pr-1">{children}</div>
            )}
        </div>
    );

    // 2. Helper to render a toggle for a section
    const renderSectionToggle = (sectionKey: string, label: string) => (
      <div className="flex items-center mb-1">
        <input
          type="checkbox"
          className="h-4 w-4 rounded text-accent-pink focus:ring-accent-pink bg-item-bg-on-panel border-panel-border"
          checked={sectionEnabled[sectionKey] !== false}
          onChange={e => setSectionEnabled(prev => ({ ...prev, [sectionKey]: !!e.target.checked }))}
        />
        <label className="ml-2 text-sm font-medium text-on-panel-primary">{label}</label>
      </div>
    );

    // 1. Add a Tabs component for all style popups (legend, axis, background, points, line, etc.)
    // 2. Remove section toggles from inside tabs (no 'Show layout style' or 'Show colors style' inside tabs)
    // 3. Style tab headers with a visible background and text color (not white on white)
    // 4. Use the same tabbed interface for all style popups

    // Add Tabs component
    const Tabs: React.FC<{ tabs: { key: string, label: string }[], active: string, onChange: (key: string) => void }> = ({ tabs, active, onChange }) => (
      <div className="flex border-b border-panel-border mb-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`px-3 py-1 text-sm font-semibold rounded-t-md focus:outline-none ${active === tab.key ? 'bg-panel-bg text-on-panel-primary border-x border-t border-panel-border -mb-px' : 'bg-item-bg-on-panel text-on-panel-muted'}`}
            style={{ minWidth: 80 }}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );

    let tabbedContent = null;
    switch (target) {
      case 'legend': {
        const tabs = [
          { key: 'layout', label: 'Layout' },
          { key: 'colors', label: 'Colors' },
        ];
        tabbedContent = (
          <div>
            <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
            {activeTab === 'layout' && (
              <div className="space-y-3">
                {renderSelect("Arrangement", 'layout' as any, [{name: 'Horizontal', value: 'horizontal'}, {name: 'Vertical', value: 'vertical'}])}
                {renderSlider("Icon Size", 'iconSize' as any, 8, 32, 1)}
                {renderSlider("Font Size", 'fontSize', 8, 24, 1)}
                <div className="flex items-center">
                  <input type="checkbox" className="h-4 w-4 rounded text-accent-pink focus:ring-accent-pink bg-item-bg-on-panel border-panel-border"
                    checked={(currentStyle as any).showGroupingLabels ?? false}
                    onChange={e => onStyleChange({ showGroupingLabels: e.target.checked })}
                  />
                  <label className="ml-2 text-sm font-medium text-on-panel-primary">Show Grouping Labels on Graph</label>
                </div>
              </div>
            )}
            {activeTab === 'colors' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-on-panel-muted">Text Color</label>
                  {renderColorSelector('color', '#000000', (newColor) => onStyleChange({ color: newColor }))}
                </div>
                <div>
                  <label className="text-xs font-medium text-on-panel-muted">Background Color</label>
                  {renderColorSelector('backgroundColor' as any, '#ffffff', (newColor) => onStyleChange({ backgroundColor: newColor } as any))}
                </div>
                {renderSlider("Background Opacity", 'backgroundOpacity' as any, 0, 1, 0.01)}
              </div>
            )}
          </div>
        );
        break;
      }
      case 'xAxis':
      case 'yAxis': {
        const tabs = [
          { key: 'label', label: 'Label' },
          { key: 'style', label: 'Style' },
        ];
        const label = target === 'xAxis' ? xAxisLabel : yAxisLabel;
        const setLabel = target === 'xAxis' ? setXAxisLabel : setYAxisLabel;
        tabbedContent = (
          <div>
            <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
            {activeTab === 'label' && (
              <div>
                <label className="text-xs font-medium text-on-panel-muted">Axis Label</label>
                <input
                  className="w-full border border-gray-400 rounded px-2 py-1 mb-2 text-gray-900 bg-white placeholder-gray-500"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="Axis Label"
                />
              </div>
            )}
            {activeTab === 'style' && (
              <div className="space-y-3">
                {'color' in currentStyle && <div><label className="text-xs font-medium text-on-panel-muted">Color</label>{renderColorSelector('color', '#000000', (newColor) => onStyleChange({ color: newColor }))}</div>}
                {'opacity' in currentStyle && renderSlider("Opacity", 'opacity', 0, 1, 0.01)}
                {'fontSize' in currentStyle && renderSlider("Font Size", 'fontSize', 8, 24, 1)}
                {'fontWeight' in currentStyle && renderToggle("Bold", 'fontWeight', 'bold', 'normal')}
                {'fontStyle' in currentStyle && renderToggle("Italic", 'fontStyle', 'italic', 'normal')}
              </div>
            )}
          </div>
        );
        break;
      }
      case 'chartBackground': {
        const tabs = [
          { key: 'color', label: 'Color' },
          { key: 'grid', label: 'Grid' },
        ];
        tabbedContent = (
          <div>
            <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
            {activeTab === 'color' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-on-panel-muted">Background Color</label>
                  {renderColorSelector('color', '#ffffff', (newColor) => onStyleChange({ color: newColor }))}
                </div>
                {renderSlider("Opacity", 'opacity', 0, 1, 0.01)}
              </div>
            )}
            {activeTab === 'grid' && renderGridOptions()}
          </div>
        );
        break;
      }
      case 'observed':
      case 'outliers':
      case 'pendingOutliers': {
        const tabs = [
          { key: 'marker', label: 'Marker' },
          { key: 'style', label: 'Style' },
        ];
        tabbedContent = (
          <div>
            <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
            {activeTab === 'marker' && (
              <div className="space-y-3">
                {'shape' in currentStyle && renderSelect("Shape", 'shape', MARKER_SHAPES.map(s => ({name: s.name, value: s.value})))}
                {'size' in currentStyle && renderSlider("Size", 'size', 2, 20, 1)}
              </div>
            )}
            {activeTab === 'style' && (
              <div className="space-y-3">
                {'color' in currentStyle && <div><label className="text-xs font-medium text-on-panel-muted">Color</label>{renderColorSelector('color', '#000000', (newColor) => onStyleChange({ color: newColor }))}</div>}
                {'opacity' in currentStyle && renderSlider("Opacity", 'opacity', 0, 1, 0.01)}
              </div>
            )}
          </div>
        );
        break;
      }
      case 'fitted': {
        const tabs = [
          { key: 'line', label: 'Line' },
          { key: 'style', label: 'Style' },
        ];
        tabbedContent = (
          <div>
            <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
            {activeTab === 'line' && (
              <div className="space-y-3">
                {'strokeWidth' in currentStyle && renderSlider("Thickness", 'strokeWidth', 1, 10, 0.5)}
                {'strokeDasharray' in currentStyle && renderSelect("Line Style", 'strokeDasharray', LINE_STYLES)}
              </div>
            )}
            {activeTab === 'style' && (
              <div className="space-y-3">
                {'color' in currentStyle && <div><label className="text-xs font-medium text-on-panel-muted">Color</label>{renderColorSelector('color', '#000000', (newColor) => onStyleChange({ color: newColor }))}</div>}
                {'opacity' in currentStyle && renderSlider("Opacity", 'opacity', 0, 1, 0.01)}
              </div>
            )}
          </div>
        );
        break;
      }
      case 'groupingStyles': {
        const tabs = [
          { key: 'line', label: 'Line' },
          { key: 'text', label: 'Text' },
          { key: 'style', label: 'Style' },
        ];
        tabbedContent = (
          <div>
            <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
            {activeTab === 'line' && (
              <div className="space-y-3">
                {'strokeWidth' in currentStyle && renderSlider("Thickness", 'strokeWidth', 1, 10, 0.5)}
                {'strokeDasharray' in currentStyle && renderSelect("Line Style", 'strokeDasharray', LINE_STYLES)}
              </div>
            )}
            {activeTab === 'text' && (
              <div className="space-y-3">
                {'fontSize' in currentStyle && renderSlider("Font Size", 'fontSize', 8, 24, 1)}
                {'fontWeight' in currentStyle && renderToggle("Bold", 'fontWeight', 'bold', 'normal')}
                {'fontStyle' in currentStyle && renderToggle("Italic", 'fontStyle', 'italic', 'normal')}
              </div>
            )}
            {activeTab === 'style' && (
              <div className="space-y-3">
                {'color' in currentStyle && <div><label className="text-xs font-medium text-on-panel-muted">Color</label>{renderColorSelector('color', '#000000', (newColor) => onStyleChange({ color: newColor }))}</div>}
                {'opacity' in currentStyle && renderSlider("Opacity", 'opacity', 0, 1, 0.01)}
              </div>
            )}
          </div>
        );
        break;
      }
      // Add more cases for groupingStyles, groupingText, etc. as needed
      default:
        tabbedContent = <div className="p-2"><p className="text-sm text-center text-on-panel-muted">Select an element to style.</p></div>;
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
                {tabbedContent}
            </div>
        </div>
    );
};

export default StylePicker;