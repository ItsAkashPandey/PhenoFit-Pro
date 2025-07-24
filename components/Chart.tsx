import React, { useState, useRef, useEffect } from 'react';
import {
  ResponsiveContainer, ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceDot, Label, ReferenceArea, ReferenceLine, Symbols
} from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { Point, KeyPoints, GroupingData, StyleTarget, ChartStyles, ChartElementPositions, DraggablePosition, MarkerStyle } from '../types';
import { toRgba } from '../services/colorUtils';

interface DraggableComponentProps {
    x?: number;
    y?: number;
    onDragStart: (e: React.MouseEvent) => void;
    onClick?: (e: any) => void;
    children?: React.ReactNode;
    position?: DraggablePosition;
    className?: string;
    style?: React.CSSProperties;
    transform?: string;
}

const DraggableWrapper: React.FC<DraggableComponentProps> = ({ x, y, onDragStart, children, position, className, style, onClick, transform }) => {
    const finalX = (x ?? 0) + (position?.x ?? 0);
    const finalY = (y ?? 0) + (position?.y ?? 0);

    return (
        <g 
            transform={`translate(${finalX}, ${finalY}) ${transform || ''}`}
            onMouseDown={onDragStart}
            onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
            style={{ cursor: 'move', ...style }}
            className={className}
        >
            {children}
        </g>
    );
};

// Define a more specific type for the tooltip props to avoid issues with recharts' internal types.
interface CustomTooltipComponentProps {
    active?: boolean;
    payload?: {
        payload: Point;
        name: NameType;
        value: ValueType;
    }[];
    xCol: string;
    yCol: string;
    isDateAxis: boolean;
}

const CustomTooltip: React.FC<CustomTooltipComponentProps> = ({ active, payload, xCol, yCol, isDateAxis }) => {
    if (!active || !payload || !payload.length) return null;
    // Filter valid items (Observed, Pending Outliers, Fitted Curve)
    const validItems = payload.filter(p => p && p.payload && typeof p.payload.x === 'number' && typeof p.payload.y === 'number' && isFinite(p.payload.x) && isFinite(p.payload.y) && (p.name === 'Observed' || p.name === 'Pending Outliers' || p.name === 'Fitted Curve'));
    if (validItems.length === 0) return null;
    return (
        <div className="p-2 bg-panel-bg border border-panel-border rounded-md shadow-lg text-sm font-sans text-on-panel-primary">
            {validItems.map((p, idx) => {
                let label = p.name;
                if (label === 'Observed' || label === 'Pending Outliers') label = 'Point';
                if (label === 'Fitted Curve') label = 'Fitted Line';
                let xValue: string | number | undefined = p.payload.originalX;
                if (xValue === undefined) {
                    if (isDateAxis) {
                        const d = new Date(p.payload.x);
                        xValue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    } else {
                        xValue = p.payload.x.toFixed(2);
                    }
                }
                let yLabel = (p.name === 'Fitted Curve') ? `${yCol} (Fitted Value)` : `${yCol} (raw)`;
                return (
                    <div key={idx} className="mb-2 last:mb-0">
                        <p className="font-bold text-accent-blue-on-panel">{label}</p>
                        <p>{`${xCol}: ${xValue}`}</p>
                        <p>{`${yLabel}: ${p.payload.y.toFixed(2)}`}</p>
                    </div>
                );
            })}
        </div>
    );
};

interface ChartProps {
  observedData: Point[];
  pendingRemovalData: Point[];
  fittedData: Point[];
  keyPoints: KeyPoints;
  groupingData: GroupingData[] | null;
  xCol: string;
  yCol: string;
  showKeyPoints: boolean;
  styles: ChartStyles;
  positions: ChartElementPositions;
  onElementClick: (e: any, target: StyleTarget, index?: number) => void;
  onDragStart: (e: React.MouseEvent, target: 'legend' | 'groupingLabel', index?: number, dragInfo?: any) => void;
  isDateAxis: boolean;
  isCircularAxis: boolean;
  chartAreaRef: React.RefObject<HTMLDivElement>;
  xAxisLabel: string;
  yAxisLabel: string;
  onAxisLabelClick: (axis: 'x' | 'y') => void;
  showLegend: boolean;
  xAxisDomain: (number | undefined)[];
  yAxisDomain: (number | undefined)[];
  isDragging: boolean;
  onLegendSizeChange: (size: { width: number; height: number }) => void;
  isRightPanelOpen: boolean;
  setIsLegendManuallyPositioned: (isManuallyPositioned: boolean) => void;
}

const Chart: React.FC<ChartProps> = ({ observedData = [], pendingRemovalData, fittedData, keyPoints, groupingData, xCol, yCol, showKeyPoints, styles, positions, onElementClick, onDragStart, isDateAxis, isCircularAxis, chartAreaRef, xAxisLabel, yAxisLabel, onAxisLabelClick, showLegend, xAxisDomain, yAxisDomain, isDragging, onLegendSizeChange, isRightPanelOpen, isLegendManuallyPositioned, setIsLegendManuallyPositioned }) => {
  const allDataForDomain = [...observedData, ...pendingRemovalData];
  const yDataDomain = allDataForDomain.length > 0 
    ? [Math.min(...allDataForDomain.map(p => p.y)), Math.max(...allDataForDomain.map(p => p.y))]
    : [0, 1];
  const yPadding = (yDataDomain[1] - yDataDomain[0]) * 0.15;
  const finalYDomain = [yDataDomain[0] - yPadding, yDataDomain[1] + yPadding];

  // Vertical staggering for grouping labels
  const getLabelYOffset = (index: number) => 10 + (index % 4) * 20;

  const formatXAxisTick = (tick: number) => {
    if (isDateAxis) {
        const d = new Date(tick);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    if (isCircularAxis) {
        let displayTick = Math.round(tick);
        while (displayTick > 365) {
            displayTick -= 365;
        }
        return displayTick.toString();
    }
    return Math.round(tick).toString();
  };

  // Legend box size state
  const [legendSize, setLegendSize] = useState<{width: number, height: number}>({ width: 240, height: 80 });
  const [isLegendManuallyResized, setIsLegendManuallyResized] = useState(false);
  const resizing = useRef<boolean | string>(false);
  const startPos = useRef<{x: number, y: number}>({x: 0, y: 0});
  const startSize = useRef<{width: number, height: number}>({width: 240, height: 80});
  const legendRef = useRef<HTMLDivElement>(null);
  const minSizeOnResizeStart = useRef<{width: number, height: number}>({width: 0, height: 0});
  const autoSize = useRef<{width: number, height: number}>({width: 0, height: 0});

  // This effect resets the legend to auto-sizing mode whenever the layout is changed.
  useEffect(() => {
      setIsLegendManuallyResized(false);
      setIsLegendManuallyPositioned(false);
  }, [styles.legend.layout]);

  // Capture the "auto" size of the legend whenever its content might change or it's not manually resized
  useEffect(() => {
    if (legendRef.current && !isLegendManuallyResized) {
      autoSize.current = {
        width: legendRef.current.offsetWidth,
        height: legendRef.current.offsetHeight
      };
    }
  }, [isLegendManuallyResized, observedData, fittedData, groupingData, styles.legend]);

  useEffect(() => {
    onLegendSizeChange(legendSize);
  }, [legendSize, onLegendSizeChange]);

  const handleResizeMoveDir = (e: MouseEvent) => {
    if (!resizing.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    let { width, height } = startSize.current;
    let dir = resizing.current as string;
    
    const minWidth = minSizeOnResizeStart.current.width;
    const minHeight = minSizeOnResizeStart.current.height;

    if (dir.includes('e')) width = Math.max(minWidth, startSize.current.width + dx);
    if (dir.includes('s')) height = Math.max(minHeight, startSize.current.height + dy);
    if (dir.includes('w')) width = Math.max(minWidth, startSize.current.width - dx);
    if (dir.includes('n')) height = Math.max(minHeight, startSize.current.height - dy);
    
    setLegendSize({ width, height });
  };

  const handleResizeEndDir = () => {
    resizing.current = false;
    window.removeEventListener('mousemove', handleResizeMoveDir);
    window.removeEventListener('mouseup', handleResizeEndDir);
  };

  // Helper: get resize direction from mouse position
  function getResizeDir(e: React.MouseEvent, rect: DOMRect) {
    const edge = 8;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let dir = '';
    if (y < edge) dir += 'n';
    if (y > rect.height - edge) dir += 's';
    if (x < edge) dir += 'w';
    if (x > rect.width - edge) dir += 'e';
    return dir;
  }

  // Track current resize direction for cursor
  const [resizeDir, setResizeDir] = useState<string | undefined>(undefined);

  // Mouse move for cursor
  const handleLegendMouseMove = (e: React.MouseEvent) => {
    if (!legendRef.current || resizing.current) return;
    const rect = legendRef.current.getBoundingClientRect();
    const dir = getResizeDir(e, rect);
    setResizeDir(dir || undefined);
  };
  const handleLegendMouseLeave = () => setResizeDir(undefined);

  // Track drag vs click for legend
  const dragStartPos = useRef<{x: number, y: number}>({x: 0, y: 0});
  const wasDragged = useRef(false);

  const handleLegendMouseDown = (e: React.MouseEvent) => {
    if (!legendRef.current) return;
    const rect = legendRef.current.getBoundingClientRect();
    const dir = getResizeDir(e, rect);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    wasDragged.current = false;
    
    if (dir) {
      resizing.current = dir;
      setIsLegendManuallyResized(true);
      setIsLegendManuallyPositioned(true);
      startPos.current = { x: e.clientX, y: e.clientY };
      startSize.current = { width: rect.width, height: rect.height };
      minSizeOnResizeStart.current = { width: autoSize.current.width || 120, height: autoSize.current.height || 48 };
      window.addEventListener('mousemove', handleResizeMoveDir);
      window.addEventListener('mouseup', handleResizeEndDir);
      e.stopPropagation();
    } else {
      // It's a potential drag
      setIsLegendManuallyPositioned(true);
      onDragStart(e, 'legend');
    }
  };

  const handleLegendMouseUp = (e: React.MouseEvent) => {
    const dx = Math.abs(e.clientX - dragStartPos.current.x);
    const dy = Math.abs(e.clientY - dragStartPos.current.y);
    // Check if it was a drag or a click
    if (dx > 5 || dy > 5) {
        wasDragged.current = true;
    } else if (!resizing.current) {
      // It's a click, but we do nothing here. Double-click is handled by onDoubleClick.
    }
    resizing.current = false; // Ensure resizing is reset
  };



  
  const renderCustomLegend = () => {
    const legendPayload = [];
    if (observedData.length > 0) legendPayload.push({ value: 'Observed', type: 'scatter', style: styles.observed });
    if (fittedData.length > 0) legendPayload.push({ value: 'Fitted Curve', type: 'line', style: styles.fitted });
    groupingData?.forEach((group, index) => { const defaultStyle = { color: '#888', strokeWidth: 2, opacity: 0.7, strokeDasharray: '3 3' }; const style = styles.groupingStyles[index] || styles.groupingStyles[0] || defaultStyle; legendPayload.push({ value: group.label, type: 'group', style }); });

    if (legendPayload.length === 0) return null;

    const legendStyle = styles.legend;
    let chartWidth = 800, chartHeight = 500;
    if (chartAreaRef && chartAreaRef.current) {
      chartWidth = chartAreaRef.current.offsetWidth;
      chartHeight = chartAreaRef.current.offsetHeight;
    }
    
    const margin = 16;
    let legendX = positions.legend.x;
    let legendY = positions.legend.y;

    const chartMargin = { top: 20, right: 30, left: 40, bottom: 30 };
    const plotAreaWidth = chartWidth - chartMargin.left - chartMargin.right;
    const plotAreaHeight = chartHeight - chartMargin.top - chartMargin.bottom;

    if (!isLegendManuallyResized && !isLegendManuallyPositioned) {
        if (isRightPanelOpen) {
            // Inside chart area (top-right)
            legendX = plotAreaWidth - legendSize.width - 20;
            legendY = 20;
        } else {
            // Right of the chart area
            legendX = chartWidth + 20;
            legendY = 20;
        }
    } else if (isLegendManuallyResized && legendRef.current) {
        const rect = legendRef.current.getBoundingClientRect();
        legendX = Math.max(chartMargin.left, Math.min(legendX, chartWidth - rect.width - chartMargin.right));
        legendY = Math.max(chartMargin.top, Math.min(legendY, chartHeight - rect.height - chartMargin.bottom));
    } else {
        legendX = Math.max(chartMargin.left, legendX);
        legendY = Math.max(chartMargin.top, legendY);
    }

    const finalContainerStyle: React.CSSProperties = {
        position: 'absolute',
        top: `${legendY}px`,
        left: `${legendX}px`,
        background: toRgba(legendStyle.backgroundColor, legendStyle.backgroundOpacity),
        padding: '5px 10px',
        border: `1px solid ${toRgba(legendStyle.color, 0.2)}`,
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        cursor: 'move',
        zIndex: 20,
        display: isLegendManuallyResized ? 'flex' : 'inline-flex',
        width: isLegendManuallyResized ? legendSize.width : 'auto',
        height: isLegendManuallyResized ? legendSize.height : 'auto',
        flexDirection: legendStyle.layout === 'vertical' ? 'column' : 'row',
        flexWrap: legendStyle.layout === 'horizontal' ? 'wrap' : 'nowrap',
        alignItems: 'flex-start',
        gap: legendStyle.layout === 'vertical' ? '5px' : '12px',
        maxWidth: '90%',
        maxHeight: '60%',
        overflow: 'auto',
    };

    const renderLegendIcon = (entry: any) => {
        const iconSize = legendStyle.iconSize;
        const style = entry.style;
        const color = toRgba(style.color, style.opacity);

        if (entry.type === 'scatter') {
            if (style.shape === 'x') {
                const halfSize = iconSize / 2;
                return <path d={`M${halfSize - 4},${halfSize - 4}L${halfSize + 4},${halfSize + 4}M${halfSize + 4},${halfSize - 4}L${halfSize - 4},${halfSize + 4}`} stroke={color} strokeWidth={2} />;
            } else if (style.shape === 'cross') {
                return <Symbols cx={iconSize/2} cy={iconSize/2} type="cross" size={iconSize * 4} fill={color} />
            }
            return <Symbols cx={iconSize/2} cy={iconSize/2} type={style.shape} size={iconSize * 4} fill={color} />
        }
        if (entry.type === 'line') {
            return <path d={`M0,${iconSize/2}h${iconSize}`} stroke={color} strokeWidth={3} strokeDasharray={style.strokeDasharray === '0' ? undefined : style.strokeDasharray} />
        }
        if (entry.type === 'group') {
            return <path d={`M0,${iconSize/2}h${iconSize}`} stroke={color} strokeWidth={3} />
        }
        return null;
    }

    return (
        <div
            ref={legendRef}
            onMouseDown={handleLegendMouseDown}
            onMouseUp={handleLegendMouseUp}
            onMouseMove={handleLegendMouseMove}
            onMouseLeave={handleLegendMouseLeave}
            onDoubleClick={(e) => onElementClick(e, 'legend')}
            style={{
                ...finalContainerStyle,
                cursor: (typeof resizeDir === 'string' && resizeDir.length > 0)
                  ? (resizeDir === 'n' || resizeDir === 's' ? 'ns-resize'
                    : resizeDir === 'e' || resizeDir === 'w' ? 'ew-resize'
                    : resizeDir === 'ne' || resizeDir === 'sw' ? 'nesw-resize'
                    : resizeDir === 'nw' || resizeDir === 'se' ? 'nwse-resize'
                    : 'move')
                  : 'move',
            }}
            className="legend-resize-hover"
        >
            {legendPayload.map((entry, index) => (
                <div key={`item-${index}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <svg width={legendStyle.iconSize} height={legendStyle.iconSize} viewBox={`0 0 ${legendStyle.iconSize} ${legendStyle.iconSize}`} style={{ marginRight: '5px', flexShrink: 0 }}>
                       {renderLegendIcon(entry)}
                    </svg>
                    <span style={{ color: legendStyle.color, fontSize: legendStyle.fontSize, fontWeight: legendStyle.fontWeight, fontStyle: legendStyle.fontStyle, whiteSpace: 'nowrap' }} title={String(entry.value)}>
                        {String(entry.value)}
                    </span>
                </div>
            ))}
        </div>
    );
  };

  const renderMarker = (props: any, style: MarkerStyle, clickHandler: (e: any) => void) => {
      const { cx, cy } = props;
      const { shape, size, color, opacity } = style;
      if (cx === undefined || cy === undefined) return null;
      const rgbaColor = toRgba(color, opacity);

      const renderSymbol = () => {
          if (shape === 'x') {
              const halfSize = size / 1.5;
              return <path d={`M${cx - halfSize},${cy - halfSize}L${cx + halfSize},${cy + halfSize}M${cx + halfSize},${cy - halfSize}L${cx - halfSize},${cy + halfSize}`} stroke={rgbaColor} strokeWidth={2} style={{ pointerEvents: 'none' }} />;
          } else if (shape === 'cross') {
              return <Symbols cx={cx} cy={cy} type="cross" size={size * size} fill={rgbaColor} style={{ pointerEvents: 'none' }} />;
          }
          return <Symbols cx={cx} cy={cy} type={shape} size={size * size} fill={rgbaColor} style={{ pointerEvents: 'none' }} />;
      };

      const hitboxSize = Math.max(24, size * 2);
      return (
          <g onClick={clickHandler} style={{ cursor: 'pointer' }}>
              <circle cx={cx} cy={cy} r={hitboxSize / 2} fill="transparent" />
              {renderSymbol()}
          </g>
      );
  };

  return (
    <div
      className="w-full h-full p-4 rounded-lg relative"
      style={{ background: toRgba(styles.chartBackground.color, styles.chartBackground.opacity) }}
      onDoubleClick={(e) => {
        const target = e.target as HTMLElement;
        if(target.classList.contains('recharts-surface') || target.classList.contains('recharts-responsive-container')) onElementClick(e, 'chartBackground')
      }}
      onMouseLeave={() => {}}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 20, right: 30, left: 40, bottom: 30 }}>
          {styles.grid.visible && <CartesianGrid strokeDasharray={styles.grid.strokeDasharray} stroke={toRgba(styles.grid.color, 0.4)} />}
          <XAxis 
            type="number" dataKey="x" name={xCol} domain={[xAxisDomain[0] ?? 'dataMin', xAxisDomain[1] ?? 'dataMax']}
            tick={{ ...styles.xAxis, fill: styles.xAxis.color }} stroke={styles.xAxis.color} tickFormatter={formatXAxisTick}
            onClick={(e: any) => onElementClick(e, 'xAxis')} height={60}
            allowDataOverflow={true}
          >
            <Label value={xAxisLabel} offset={-5} position="insideBottom" style={{ ...styles.xAxis, fill: styles.xAxis.color, cursor: 'pointer' }} onClick={() => onAxisLabelClick('x')} />
          </XAxis>
          <YAxis 
            type="number" dataKey="y" name={yCol} domain={[yAxisDomain[0] ?? 'dataMin', yAxisDomain[1] ?? 'dataMax']}
            tick={{ ...styles.yAxis, fill: styles.yAxis.color }} stroke={styles.yAxis.color} tickFormatter={(tick) => tick.toFixed(2)}
            onClick={(e: any) => onElementClick(e, 'yAxis')} width={80}
            allowDataOverflow={true}
          >
             <Label value={yAxisLabel} angle={-90} offset={-25} position="insideLeft" style={{ ...styles.yAxis, textAnchor: 'middle', fill: styles.yAxis.color, cursor: 'pointer' }} onClick={() => onAxisLabelClick('y')} />
          </YAxis>
          
          {/* Legend is now rendered outside the ComposedChart */}
          
          {groupingData?.map((group, index) => {
              const groupStyle = styles.groupingStyles[index] || styles.groupingStyles[0];
              const textStyle = styles.groupingText;
              const hasLabel = typeof group.label === 'string' && group.label.trim() !== '';
              const groupRgbaColor = toRgba(groupStyle.color, groupStyle.opacity);
              if (group.end != null) {
                  return (
                      <ReferenceArea key={`group-${index}`} x1={group.start} x2={group.end}
                          stroke={groupRgbaColor} fill={groupRgbaColor}
                          strokeDasharray={groupStyle.strokeDasharray}
                          onClick={(e) => onElementClick(e, 'groupingStyles', index)} 
                          label={hasLabel && styles.showGroupingLabels ? (props: any) => {
                              if (!props.viewBox || !props.viewBox.x || !props.viewBox.y) return <></>;
                              const { x, y, width, height } = props.viewBox;
                              const labelX = x + width / 2;
                              const labelY = y + 20; // Initial position inside the area
                              return (
                                <DraggableWrapper onDragStart={(e) => onDragStart(e, 'groupingLabel', index, { areaBounds: {x,y,width,height}, labelBase: {x: labelX, y: labelY} })} position={positions.groupingLabels[index]} x={labelX} y={labelY}>
                                    <text textAnchor="middle" style={{ ...textStyle, fill: textStyle.color, fontSize: `${textStyle.fontSize}px` }}>{String(group.label)}</text>
                                </DraggableWrapper>
                              )
                          } : undefined}
                        />
                  )
              }
              return (
                <React.Fragment key={`group-${index}`}>
                    <ReferenceLine x={group.start} stroke="transparent" strokeWidth={20}
                        onClick={(e) => onElementClick(e, 'groupingStyles', index)} 
                    />
                    <ReferenceLine x={group.start} stroke={groupRgbaColor}
                        strokeDasharray={groupStyle.strokeDasharray} strokeWidth={groupStyle.strokeWidth}
                        label={hasLabel && styles.showGroupingLabels ? (props: any) => {
                            if (!props.viewBox || !props.viewBox.x) return <></>;
                            const { x } = props.viewBox;
                            const labelY = getLabelYOffset(index);
                            return (
                                 <DraggableWrapper onDragStart={(e) => onDragStart(e, 'groupingLabel', index)} position={positions.groupingLabels[index]} x={x} y={labelY}>
                                    <text textAnchor="middle" style={{...textStyle, fill: textStyle.color, fontSize: `${textStyle.fontSize}px`}}>{String(group.label)}</text>
                                </DraggableWrapper>
                            )
                        } : undefined}
                     />
                </React.Fragment>
              )
          })}

          <Scatter
            name="Observed"
            data={observedData}
            dataKey="y"
            isAnimationActive={false}
            shape={(props) => renderMarker(props, styles.observed, (e) => onElementClick(e, 'observed'))}
          />
          <Scatter
            name="Pending Outliers"
            data={pendingRemovalData}
            dataKey="y"
            isAnimationActive={false}
            shape={(props) => renderMarker(props, styles.pendingOutliers, (e) => onElementClick(e, 'pendingOutliers'))}
          />
          
          {fittedData.length > 1 && (
            <Line
              name="Fitted Curve Hitbox"
              data={fittedData}
              dataKey="y"
              type="monotoneX"
              stroke="transparent"
              strokeWidth={20}
              dot={false}
              isAnimationActive={false}
              connectNulls={true}
              onClick={(e) => onElementClick(e, 'fitted')}
              style={{ cursor: 'pointer' }}
            />
          )}
          
          <Line
            name="Fitted Curve"
            data={fittedData}
            dataKey="y"
            type="monotoneX"
            stroke={toRgba(styles.fitted.color, styles.fitted.opacity)}
            strokeWidth={styles.fitted.strokeWidth}
            strokeDasharray={styles.fitted.strokeDasharray === '0' ? undefined : styles.fitted.strokeDasharray}
            dot={false}
            isAnimationActive={false}
            connectNulls={true}
          />

          {showKeyPoints && keyPoints.sos && (<ReferenceDot x={keyPoints.sos.x} y={keyPoints.sos.y} r={6} fill="#28a745" stroke="white" strokeWidth={2}><Label value="SOS" position="top" fill="#212529" fontSize={12} fontWeight="bold" /></ReferenceDot>)}
          {showKeyPoints && keyPoints.eos && (<ReferenceDot x={keyPoints.eos.x} y={keyPoints.eos.y} r={6} fill="#ffc107" stroke="white" strokeWidth={2}><Label value="EOS" position="top" fill="#212529" fontSize={12} fontWeight="bold" /></ReferenceDot>)}
          {showKeyPoints && keyPoints.peak && (<ReferenceDot x={keyPoints.peak.x} y={keyPoints.peak.y} r={6} fill="#dc3545" stroke="white" strokeWidth={2}><Label value="Peak" position="top" fill="#212529" fontSize={12} fontWeight="bold" /></ReferenceDot>)}
        </ComposedChart>
      </ResponsiveContainer>
      
      <div style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none'}}>
        <div
          style={{position: 'absolute', left: 60, right: 40, bottom: 24, height: 40, cursor: 'pointer', pointerEvents: 'auto', zIndex: 10}}
          onClick={(e) => { e.stopPropagation(); onElementClick(e, 'xAxis'); }}
        />
        <div
          style={{position: 'absolute', left: 0, top: 40, width: 40, bottom: 40, cursor: 'pointer', pointerEvents: 'auto', zIndex: 10}}
          onClick={(e) => { e.stopPropagation(); onElementClick(e, 'yAxis'); }}
        />
        <div
          style={{position: 'absolute', left: 120, right: 120, bottom: 0, height: 32, cursor: 'pointer', pointerEvents: 'auto', zIndex: 20}}
          onClick={(e) => { e.stopPropagation(); onAxisLabelClick('x'); }}
        />
        <div
          style={{position: 'absolute', left: 0, top: '50%', width: 40, height: 40, transform: 'translateY(-50%)', cursor: 'pointer', pointerEvents: 'auto', zIndex: 20}}
          onClick={(e) => { e.stopPropagation(); onAxisLabelClick('y'); }}
        />
      </div>
      {showLegend && renderCustomLegend()}
    </div>
  );
};

export default Chart;