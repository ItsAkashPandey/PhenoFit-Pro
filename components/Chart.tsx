

import React from 'react';
import {
  ResponsiveContainer, ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceDot, Label, ReferenceArea, ReferenceLine, Symbols
} from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { Point, KeyPoints, GroupingData, StyleTarget, ChartStyles, ChartElementPositions, DraggablePosition } from '../types';

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
    if (active && payload && payload.length) {
        const dataPoint = payload[0].payload;
        if (!dataPoint || typeof dataPoint.x === 'undefined' || typeof dataPoint.y === 'undefined') {
            return null;
        }

        let xValue: string | number | undefined = dataPoint.originalX;
        
        if (xValue === undefined) {
            if (isDateAxis) {
                const d = new Date(dataPoint.x);
                xValue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            } else {
                xValue = dataPoint.x.toFixed(2);
            }
        }
        
        return (
            <div className="p-2 bg-panel-bg border border-panel-border rounded-md shadow-lg text-sm font-sans text-text-on-panel-primary">
                <p className="font-bold text-accent-blue-on-panel">{payload.find(p => p.name === 'Fitted Curve')?.name || payload[0].name}</p>
                <p>{`${xCol}: ${xValue}`}</p>
                <p>{`${yCol}: ${dataPoint.y.toFixed(2)}`}</p>
            </div>
        );
    }
    return null;
};

const CustomScatterShape = (props: any) => {
    const { cx, cy, fill, opacity, shape, size, stroke, strokeWidth, onClick } = props;
    if (cx === undefined || cy === undefined) return null;
    const hitboxSize = Math.max(24, size * 2); // Make hitbox large
    return (
        <g onClick={onClick} style={{cursor: 'pointer'}}>
            <circle cx={cx} cy={cy} r={hitboxSize / 2} fill="transparent" />
            <Symbols cx={cx} cy={cy} type={shape} size={size * size / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} style={{opacity, pointerEvents: 'none'}} />
        </g>
    );
};


const hexToRgba = (hex: string, opacity: number): string => {
    let c: any;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${opacity})`;
    }
    return hex; // Fallback for invalid hex
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
}

const Chart: React.FC<ChartProps> = ({ observedData, pendingRemovalData, fittedData, keyPoints, groupingData, xCol, yCol, showKeyPoints, styles, positions, onElementClick, onDragStart, isDateAxis, isCircularAxis }) => {
  const allDataForDomain = [...observedData, ...pendingRemovalData];
  const yDataDomain = allDataForDomain.length > 0 
    ? [Math.min(...allDataForDomain.map(p => p.y)), Math.max(...allDataForDomain.map(p => p.y))]
    : [0, 1];
  const yPadding = (yDataDomain[1] - yDataDomain[0]) * 0.15;
  const yDomain = [yDataDomain[0] - yPadding, yDataDomain[1] + yPadding];

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

  const getBackgroundStyle = () => {
    const { color = '#ffffff', opacity = 1 } = styles.chartBackground || {};
    return { background: hexToRgba(color, opacity) };
  };

  return (
    <div className="w-full h-full p-4 rounded-lg" style={getBackgroundStyle()} onClick={(e) => {
        const target = e.target as HTMLElement;
        if(target.classList.contains('recharts-surface') || target.classList.contains('recharts-responsive-container')) onElementClick(e, 'chartBackground')
    }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 20, right: 30, left: 40, bottom: 30 }}>
          {styles.grid.visible && <CartesianGrid strokeDasharray={styles.grid.strokeDasharray} strokeOpacity={0.4} stroke={styles.grid.color} />}
          <XAxis 
            type="number" dataKey="x" name={xCol} domain={['dataMin', 'dataMax']}
            tick={{ ...styles.xAxis, fill: styles.xAxis.color }} stroke={styles.xAxis.color} tickFormatter={formatXAxisTick}
            onClick={(e: any) => onElementClick(e, 'xAxis')} height={60}
          >
            <Label value={xCol} offset={-5} position="insideBottom" style={{ ...styles.xAxis, fill: styles.xAxis.color, cursor: 'pointer' }} />
          </XAxis>
          <YAxis 
            type="number" dataKey="y" name={yCol} domain={yDomain}
            tick={{ ...styles.yAxis, fill: styles.yAxis.color }} stroke={styles.yAxis.color} tickFormatter={(tick) => tick.toFixed(2)}
            onClick={(e: any) => onElementClick(e, 'yAxis')} width={80}
          >
             <Label value={yCol} angle={-90} offset={-25} position="insideLeft" style={{ ...styles.yAxis, textAnchor: 'middle', fill: styles.yAxis.color, cursor: 'pointer' }}/>
          </YAxis>
          <Tooltip content={<CustomTooltip xCol={xCol} yCol={yCol} isDateAxis={isDateAxis} />} cursor={{ stroke: '#9ca3af', strokeDasharray: '3 3' }} />
          
           <Legend 
            content={(props: any) => {
                if (!props.viewBox) return null;
                const {payload, viewBox} = props;
                const legendX = (viewBox.x ?? 0);
                const legendY = (viewBox.y ?? 0) - 20;
                const filteredPayload = payload?.filter((p: any) => p.value !== 'Outliers' && p.value !== 'Pending Outliers');

                return (
                    <DraggableWrapper 
                        x={legendX} y={legendY}
                        onDragStart={(e) => onDragStart(e, 'legend')} 
                        position={positions.legend}>
                         <foreignObject x={0} y={0} width={300} height={50}>
                             <div
                                style={{
                                    background: 'rgba(255, 255, 255, 0.85)',
                                    padding: '5px 10px',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '5px',
                                    display: 'inline-block'
                                }}
                                onClick={(e: any) => onElementClick(e, 'legend')}
                             >
                                <ul className="recharts-default-legend" style={{...styles.legend}}>
                                   {filteredPayload?.map((entry: any, index: number) => (
                                        <li key={`item-${index}`} className="recharts-legend-item" style={{display: 'inline-block', marginRight: '10px'}}>
                                            <svg className="recharts-surface" width="14" height="14" viewBox="0 0 32 32" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '4px'}}>
                                                <path stroke="none" fill={entry.color} d="M0,4h32v24h-32z" className="recharts-legend-icon"></path>
                                            </svg>
                                            <span className="recharts-legend-item-text" style={{color: styles.legend.color}}>{String(entry.value)}</span>
                                        </li>
                                   ))}
                                </ul>
                            </div>
                        </foreignObject>
                    </DraggableWrapper>
                )
            }}
            />
          
          {groupingData?.map((group, index) => {
              const groupStyle = styles.groupingStyles[index] || styles.groupingStyles[0];
              const textStyle = styles.groupingText;
              
              if (group.end != null) {
                  return (
                      <ReferenceArea key={`group-${index}`} x1={group.start} x2={group.end}
                          stroke={groupStyle.color} fill={groupStyle.color} fillOpacity={groupStyle.opacity}
                          strokeOpacity={groupStyle.opacity} strokeDasharray={groupStyle.strokeDasharray}
                          onClick={(e) => onElementClick(e, 'groupingStyles', index)} 
                          label={(props) => {
                              if (!props.viewBox || !props.viewBox.x || !props.viewBox.y) return null;
                              const { x, y, width, height } = props.viewBox;
                              const labelX = x + width / 2;
                              const labelY = y + 20; // Initial position inside the area
                              return (
                                <DraggableWrapper onDragStart={(e) => onDragStart(e, 'groupingLabel', index, { areaBounds: {x,y,width,height}, labelBase: {x: labelX, y: labelY} })} position={positions.groupingLabels[index]} x={labelX} y={labelY}>
                                    <text textAnchor="middle" style={{ ...textStyle, fill: textStyle.color, fontSize: `${textStyle.fontSize}px` }}>{String(group.label)}</text>
                                </DraggableWrapper>
                              )
                          }}
                        />
                  )
              }
              return (
                <React.Fragment key={`group-${index}`}>
                    {/* Hitbox for line */}
                    <ReferenceLine x={group.start} stroke="transparent" strokeWidth={20}
                        onClick={(e) => onElementClick(e, 'groupingStyles', index)} 
                    />
                    {/* Visible Line */}
                    <ReferenceLine x={group.start} stroke={groupStyle.color}
                        strokeDasharray={groupStyle.strokeDasharray} strokeWidth={groupStyle.strokeWidth} opacity={groupStyle.opacity}
                        label={(props) => {
                            if (!props.viewBox || !props.viewBox.x) return null;
                            const { x } = props.viewBox;
                            const labelY = getLabelYOffset(index);
                            return (
                                 <DraggableWrapper onDragStart={(e) => onDragStart(e, 'groupingLabel', index)} position={positions.groupingLabels[index]} x={x} y={labelY}>
                                    <text textAnchor="middle" style={{...textStyle, fill: textStyle.color, fontSize: `${textStyle.fontSize}px`}}>{String(group.label)}</text>
                                </DraggableWrapper>
                            )
                        }}
                     />
                </React.Fragment>
              )
          })}

          <Scatter name="Observed" data={observedData} dataKey="y"
            shape={<CustomScatterShape {...styles.observed} onClick={(e: any) => onElementClick(e, 'observed')} />}
            isAnimationActive={false}/>
          
          <Scatter name="Pending Outliers" data={pendingRemovalData} dataKey="y"
            shape={<CustomScatterShape {...styles.pendingOutliers} stroke={styles.pendingOutliers.color} strokeWidth={2} fill="transparent" onClick={(e: any) => onElementClick(e, 'pendingOutliers')} />}
            isAnimationActive={false}/>
          
          {fittedData.length > 0 && (
            <>
              {/* Invisible line for easier clicking */}
              <Line name="Fitted Curve Hit Area" data={fittedData} dataKey="y"
                  stroke="transparent" strokeWidth={30}
                  activeDot={false} dot={false}
                  isAnimationActive={false}
                  onClick={(e: any) => onElementClick(e, 'fitted')}
                  connectNulls={true}
              />
              {/* Visible line */}
              <Line name="Fitted Curve" data={fittedData} dataKey="y"
                type="monotoneX"
                stroke={styles.fitted.color} 
                strokeWidth={styles.fitted.strokeWidth} 
                strokeDasharray={styles.fitted.strokeDasharray === '0' ? undefined : styles.fitted.strokeDasharray} 
                strokeOpacity={styles.fitted.opacity}
                dot={false}
                isAnimationActive={false}
                connectNulls={true}
              />
            </>
          )}

          {showKeyPoints && keyPoints.sos && (<ReferenceDot x={keyPoints.sos.x} y={keyPoints.sos.y} r={6} fill="#28a745" stroke="white" strokeWidth={2}><Label value="SOS" position="top" fill="#212529" fontSize={12} fontWeight="bold" /></ReferenceDot>)}
          {showKeyPoints && keyPoints.eos && (<ReferenceDot x={keyPoints.eos.x} y={keyPoints.eos.y} r={6} fill="#ffc107" stroke="white" strokeWidth={2}><Label value="EOS" position="top" fill="#212529" fontSize={12} fontWeight="bold" /></ReferenceDot>)}
          {showKeyPoints && keyPoints.peak && (<ReferenceDot x={keyPoints.peak.x} y={keyPoints.peak.y} r={6} fill="#dc3545" stroke="white" strokeWidth={2}><Label value="Peak" position="top" fill="#212529" fontSize={12} fontWeight="bold" /></ReferenceDot>)}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Chart;
