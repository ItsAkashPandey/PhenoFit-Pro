import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import ControlPanel from './components/ControlPanel';
import Chart from './components/Chart';
import GroupingDialog from './components/GroupingDialog';
import StylePicker from './components/ui/StylePicker';
import ResultsPanel from './components/ResultsPanel';
import { Point, CurveModel, FitParameters, KeyPoints, GroupingConfig, GroupingData, StylePickerState, StyleTarget, ChartStyles, LineStyle, MarkerStyle, TextStyle, ChartElementPositions, DraggablePosition, BackgroundStyle, OutlierMethod, GridStyle } from './types';
import { doubleLogistic, singleLogistic, loess, movingAverage, savitzkyGolay, optimizeParameters } from './services/curveFitService';
import { downloadChartImage, downloadExcelData } from './services/downloadService';

const SPECTRAL_PALETTE = [ '#5e4fa2', '#3288bd', '#66c2a5', '#abdda4', '#e6f598', '#fee08b', '#fdae61', '#f46d43', '#d53e4f', '#9e0142' ];

const initialStyles: ChartStyles = {
    observed: { color: '#007bff', shape: 'circle', size: 6, opacity: 0.7 },
    outliers: { color: '#ef4444', shape: 'cross', size: 8, opacity: 0.9 },
    pendingOutliers: { color: '#f97316', shape: 'circle', size: 7, opacity: 0.9 },
    fitted: { color: '#d63384', strokeWidth: 3, opacity: 1, strokeDasharray: '0' },
    xAxis: { color: '#212529', fontSize: 14, fontWeight: 'normal', fontStyle: 'normal' },
    yAxis: { color: '#212529', fontSize: 14, fontWeight: 'normal', fontStyle: 'normal' },
    groupingText: { color: '#212529', fontSize: 12, fontWeight: 'bold', fontStyle: 'normal' },
    groupingStyles: [],
    legend: { color: '#212529', fontSize: 12, fontWeight: 'normal', fontStyle: 'normal'},
    chartBackground: { color: '#ffffff', opacity: 1 },
    grid: { visible: true, color: '#adb5bd', strokeDasharray: '3 3' }
};

type DragInfo = {
    areaBounds: { x: number; y: number; width: number; height: number; };
    labelBase: { x: number; y: number; };
};

type DragState = {
    isDragging: boolean;
    target: 'legend' | 'groupingLabel' | 'stylePicker' | null;
    index?: number;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    dragInfo?: DragInfo;
};

const parseDateValue = (value: any): number | null => {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.getTime();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    // Attempt to parse common date formats, including ISO strings and excel dates
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.getTime();
    }
  }
  return null;
};

const App: React.FC = () => {
    // Data State
    const [rawData, setRawData] = useState<any[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [selectedXCol, setSelectedXCol] = useState('');
    const [selectedYCol, setSelectedYCol] = useState('');
    
    // Outlier state
    const [isOutlierRemovalEnabled, setIsOutlierRemovalEnabled] = useState(false);
    const [outlierMethod, setOutlierMethod] = useState<OutlierMethod>(OutlierMethod.SD);
    const [outlierThreshold, setOutlierThreshold] = useState(3);
    const [confirmedRemovedData, setConfirmedRemovedData] = useState<Point[]>([]);

    // Grouping State
    const [groupingRawData, setGroupingRawData] = useState<any[]|null>(null);
    const [groupingColumns, setGroupingColumns] = useState<string[]>([]);
    const [groupingData, setGroupingData] = useState<GroupingData[] | null>(null);
    const [isGroupingDialogVisible, setIsGroupingDialogVisible] = useState(false);

    // Model & Parameters State
    const [curveModel, setCurveModel] = useState<CurveModel>(CurveModel.DOUBLE_LOGISTIC);
    const [parameters, setParameters] = useState<FitParameters>({
        baseline: 0.1, amplitude: 0.6, start: 50, end: 200, growthRate: 0.1, senescenceRate: 0.05,
        L: 0.7, k: 0.1, x0: 125, span: 0.5, windowSize: 15,
    });
    const [lockedParams, setLockedParams] = useState<Set<keyof FitParameters>>(new Set());
    const [hasUserOptimized, setHasUserOptimized] = useState(false);
    
    // UI & Chart State
    const [fittedData, setFittedData] = useState<Point[]>([]);
    const [keyPoints, setKeyPoints] = useState<KeyPoints>({ sos: null, eos: null, peak: null });
    const [stats, setStats] = useState({ r2: 0, rmse: 0 });
    const [showKeyPoints, setShowKeyPoints] = useState(true);
    const [styles, setStyles] = useState<ChartStyles>(initialStyles);
    const [stylePickerState, setStylePickerState] = useState<Omit<StylePickerState, 'currentStyle'>>({ visible: false, top: 0, left: 0, target: null });
    const [elementPositions, setElementPositions] = useState<ChartElementPositions>({
        legend: { x: 0, y: 0},
        groupingLabels: []
    });
    const [dragState, setDragState] = useState<DragState>({isDragging: false, target: null, startX: 0, startY: 0, initialX: 0, initialY: 0});
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const mainAreaRef = useRef<HTMLDivElement>(null);
    
    // Loading State
    const [isOptimizing, setIsOptimizing] = useState(false);
    const isDataLoaded = rawData.length > 0;
    
    // Derived state for chart axis type
    const isDateAxis = /date/i.test(selectedXCol);
    const isCircularAxis = /doy|day of year/i.test(selectedXCol);

    const estimateSmartParameters = useCallback((data: Point[], isDate: boolean): Partial<FitParameters> => {
        if (data.length < 10) return {};
        const ySorted = [...data.map(p => p.y)].sort((a,b) => a-b);
        const baseline = ySorted[Math.floor(ySorted.length * 0.05)];
        const peakY = ySorted[Math.floor(ySorted.length * 0.95)];
        const amplitude = peakY - baseline;
        const peakPoint = data.reduce((max, p) => p.y > max.y ? p : max, data[0]);
        const peakTime = peakPoint.x;
        const firstHalf = data.filter(p => p.x <= peakTime);

        let sosTimeGuess, eosTimeGuess;
        if(isDate) {
            sosTimeGuess = peakTime - (30 * 86400000); // 30 days in ms
            eosTimeGuess = peakTime + (50 * 86400000); // 50 days in ms
        } else {
            sosTimeGuess = peakTime - 30;
            eosTimeGuess = peakTime + 50;
        }

        const sosPoint = firstHalf.length > 1 ? firstHalf.reduce((prev, curr) => Math.abs(curr.y - (baseline + amplitude * 0.25)) < Math.abs(prev.y - (baseline + amplitude * 0.25)) ? curr : prev) : {x: sosTimeGuess, y: 0};
        const endPoint = data[data.length-1];
        
        const estEnd = Math.round(peakTime + (endPoint.x - peakTime) * 0.5) || eosTimeGuess;

        return { 
            baseline: parseFloat(baseline.toFixed(4)), 
            amplitude: parseFloat(amplitude.toFixed(4)), 
            start: Math.round(sosPoint.x), 
            end: estEnd, 
            growthRate: 0.1, senescenceRate: 0.05, 
            L: parseFloat(peakY.toFixed(4)), 
            k: 0.1, 
            x0: Math.round(peakTime) 
        };
    }, []);

    const readFile = (file: File, callback: (data: any[]) => void) => {
        const fileType = file.name.split('.').pop()?.toLowerCase();
        if (fileType === 'csv') {
            Papa.parse(file, { header: true, dynamicTyping: true, skipEmptyLines: true, complete: (res) => callback(res.data as any[]), error: (err) => alert(`Error: ${err.message}`) });
        } else if (fileType === 'xlsx' || fileType === 'xls') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const workbook = XLSX.read(e.target?.result, { type: 'array', cellDates: true });
                    callback(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]));
                } catch (err) { alert(`Error parsing Excel: ${err instanceof Error ? err.message : 'Unknown'}`); }
            };
            reader.readAsArrayBuffer(file);
        } else { alert("Unsupported file type."); }
    };

    const handleFileLoad = (file: File) => readFile(file, (data) => {
        if (!data || data.length === 0) return alert("File is empty.");
        setHasUserOptimized(false);
        setLockedParams(new Set());
        setRawData(data);
        const cols = Object.keys(data[0] || {});
        setColumns(cols);
        setSelectedXCol(cols.find(c => /date|doy|das|day/i.test(c)) || cols[0] || '');
        setSelectedYCol(cols.find(c => /ndvi|gcc|value|index/i.test(c)) || (cols.length > 1 ? cols[1] : ''));
        handleClearGrouping();
        setConfirmedRemovedData([]);
    });
    
    const handleGroupingFileLoad = (file: File) => readFile(file, (data) => {
        if (!data || data.length === 0) return alert("Grouping file is empty.");
        setGroupingRawData(data);
        setGroupingColumns(Object.keys(data[0] || {}));
        setIsGroupingDialogVisible(true);
    });

    const handleClearGrouping = () => { setGroupingData(null); setGroupingRawData(null); setGroupingColumns([]); setStyles(prev => ({...prev, groupingStyles: []})); setElementPositions(prev => ({ ...prev, groupingLabels: [] }));};

    const handleGroupingConfigSubmit = (config: GroupingConfig) => {
        if (!groupingRawData) return;
        const newGroupingData = groupingRawData.map((row) => {
            const labelValue = row[config.labelCol];
            const labelString = (typeof labelValue === 'object' && labelValue !== null) 
                ? JSON.stringify(labelValue) 
                : String(labelValue ?? '');
    
            const startVal = isDateAxis ? parseDateValue(row[config.startCol]) : parseFloat(row[config.startCol]);
            const endVal = (config.endCol && row[config.endCol] != null) 
                ? (isDateAxis ? parseDateValue(row[config.endCol]) : parseFloat(row[config.endCol])) 
                : null;

            return {
                start: startVal,
                end: endVal,
                label: labelString,
                color: config.colorCol ? row[config.colorCol] : 'placeholder'
            };
        }).filter(g => g.start != null && !isNaN(g.start) && g.label != null);
        
        const isEventOnly = config.endCol === null;
        const newGroupingStyles = newGroupingData.map((_, index) => ({
            color: SPECTRAL_PALETTE[index % SPECTRAL_PALETTE.length],
            strokeWidth: isEventOnly ? 3 : 2,
            opacity: 0.4,
            strokeDasharray: isEventOnly ? '5 5' : '0'
        }));

        setGroupingData(newGroupingData as GroupingData[]);
        setStyles(prev => ({...prev, groupingStyles: newGroupingStyles }));
        setElementPositions(prev => ({...prev, groupingLabels: newGroupingData.map(() => ({x: 0, y: 0})) }));
        setIsGroupingDialogVisible(false);
    };

    // This is the core data processing pipeline. It's memoized to prevent re-render loops.
    // It handles parsing, transformations (like for circular DOY axes), and outlier detection.
    const processedData = useMemo(() => {
        // 1. Initial Parsing from Raw Data
        let parsedData: Point[] = rawData.map(row => {
            const xVal = row[selectedXCol];
            const yVal = row[selectedYCol];
            return {
                x: isDateAxis ? parseDateValue(xVal) : parseFloat(xVal),
                y: parseFloat(yVal),
                originalX: xVal
            };
        }).filter(p => p.x != null && p.y != null && !isNaN(p.x) && !isNaN(p.y)) as Point[];

        // 2. Sorting (crucially, skip for circular axes to preserve chronological order from file)
        if (!isCircularAxis) {
            parsedData.sort((a, b) => a.x - b.x);
        }

        // 3. Circular Axis Transformation
        let transformedData = parsedData;
        let transformedGrouping = groupingData ? JSON.parse(JSON.stringify(groupingData)) : null;

        if (isCircularAxis && parsedData.length > 1) {
            let maxDrop = 0;
            let breakIndex = -1;
            for (let i = 1; i < parsedData.length; i++) {
                const drop = parsedData[i - 1].x - parsedData[i].x;
                if (drop > maxDrop) {
                    maxDrop = drop;
                    breakIndex = i;
                }
            }

            if (breakIndex !== -1 && maxDrop > 180) {
                const offset = 365;
                const originalBreakValue = parsedData[breakIndex].x;
                transformedData = parsedData.map((p, i) => (i >= breakIndex ? { ...p, x: p.x + offset } : p));
                
                if (transformedGrouping) {
                    transformedGrouping.forEach((g: GroupingData) => {
                        if (g.start >= originalBreakValue) g.start += offset;
                        if (g.end !== null && g.end >= originalBreakValue) g.end += offset;
                    });
                }
            }
        }
        
        // 4. Outlier Detection
        const dataToScan = transformedData.filter(p => !confirmedRemovedData.find(rem => rem.originalX === p.originalX && rem.y === p.y));
        let pendingOutliers = new Set<Point>();
        if(isOutlierRemovalEnabled) {
            const yValues = dataToScan.map(p => p.y);
            switch(outlierMethod) {
                case OutlierMethod.SD: {
                    const mean = yValues.reduce((a, b) => a + b, 0) / yValues.length;
                    const stdDev = Math.sqrt(yValues.map(y => Math.pow(y - mean, 2)).reduce((a, b) => a + b, 0) / yValues.length);
                    const threshold = outlierThreshold * stdDev;
                    dataToScan.forEach(p => { if (Math.abs(p.y - mean) > threshold) pendingOutliers.add(p); });
                    break;
                }
                case OutlierMethod.IQR: {
                    const sortedY = [...yValues].sort((a, b) => a - b);
                    const q1 = sortedY[Math.floor(sortedY.length * 0.25)];
                    const q3 = sortedY[Math.floor(sortedY.length * 0.75)];
                    const iqr = q3 - q1;
                    const lowerBound = q1 - outlierThreshold * iqr;
                    const upperBound = q3 + outlierThreshold * iqr;
                    dataToScan.forEach(p => { if (p.y < lowerBound || p.y > upperBound) pendingOutliers.add(p); });
                    break;
                }
                case OutlierMethod.MOVING_WINDOW_SD: {
                     const windowSize = 10;
                     for (let i = 0; i < dataToScan.length; i++) {
                        const start = Math.max(0, i - Math.floor(windowSize / 2));
                        const end = Math.min(dataToScan.length, i + Math.ceil(windowSize / 2));
                        const window = dataToScan.slice(start, end);
                        if (window.length < 3) continue;
                        const windowY = window.map(p => p.y);
                        const mean = windowY.reduce((a,b) => a+b, 0) / windowY.length;
                        const stdDev = Math.sqrt(windowY.map(y => Math.pow(y - mean, 2)).reduce((a, b) => a + b, 0) / windowY.length);
                        if (stdDev > 0 && Math.abs(dataToScan[i].y - mean) > outlierThreshold * stdDev) {
                            pendingOutliers.add(dataToScan[i]);
                        }
                     }
                    break;
                }
            }
        }
        
        // 5. Final Data Sets
        const pendingRemovalData = Array.from(pendingOutliers);
        const keptData = transformedData.filter(p => !confirmedRemovedData.find(rem => rem.originalX === p.originalX && rem.y === p.y));
        const xDomain: [number, number] | null = transformedData.length > 0 ? [Math.min(...transformedData.map(p => p.x)), Math.max(...transformedData.map(p => p.x))] : null;
        
        return { keptData, pendingRemovalData, transformedGrouping, xDomain };

    }, [rawData, selectedXCol, selectedYCol, isDateAxis, isCircularAxis, groupingData, isOutlierRemovalEnabled, outlierMethod, outlierThreshold, confirmedRemovedData]);

    const { keptData, pendingRemovalData, transformedGrouping: transformedGroupingData, xDomain } = processedData;

    useEffect(() => {
        if (keptData.length > 0 && !hasUserOptimized) {
            const smartParams = estimateSmartParameters(keptData, isDateAxis);
            setParameters(prev => ({ ...prev, ...smartParams }));
        }
    }, [keptData, hasUserOptimized, isDateAxis, estimateSmartParameters]);

    const calculateFit = useCallback(() => {
        if (keptData.length === 0) { setFittedData([]); setKeyPoints({ sos: null, eos: null, peak: null }); setStats({ r2: 0, rmse: 0 }); return; }
        
        let newFittedData: Point[] = [], yPredicted: number[] = [], newKeyPoints: KeyPoints = { sos: null, eos: null, peak: null };

        // --- Normalization for Date Axis ---
        const minTimestamp = isDateAxis ? Math.min(...keptData.map(p => p.x)) : 0;
        const normalizeX = (x: number) => isDateAxis ? (x - minTimestamp) / 86400000 : x;
        const denormalizeX = (x: number) => isDateAxis ? (x * 86400000) + minTimestamp : x;
        
        const dataForFit = keptData.map(p => ({...p, x: normalizeX(p.x)}));
        const paramsForFit = {...parameters};
        if(isDateAxis) {
            paramsForFit.start = normalizeX(parameters.start);
            paramsForFit.end = normalizeX(parameters.end);
            paramsForFit.x0 = normalizeX(parameters.x0);
        }
        // --- End Normalization ---

        const xRange = dataForFit.map(p => p.x);
        const tFit = Array.from({ length: 200 }, (_, i) => Math.min(...xRange) + i * (Math.max(...xRange) - Math.min(...xRange)) / 199);

        switch(curveModel) {
            case CurveModel.DOUBLE_LOGISTIC: {
                newFittedData = tFit.map(t => ({ x: denormalizeX(t), y: doubleLogistic(t, paramsForFit) }));
                yPredicted = dataForFit.map(p => doubleLogistic(p.x, paramsForFit));
                if (newFittedData.length > 0) { 
                    const peak = newFittedData.reduce((max, p) => p.y > max.y ? p : max, newFittedData[0]); 
                    newKeyPoints = { 
                        peak, 
                        sos: { x: denormalizeX(paramsForFit.start), y: doubleLogistic(paramsForFit.start, paramsForFit) }, 
                        eos: { x: denormalizeX(paramsForFit.end), y: doubleLogistic(paramsForFit.end, paramsForFit) }
                    }; 
                }
                break;
            }
            case CurveModel.SINGLE_LOGISTIC: {
                newFittedData = tFit.map(t => ({ x: denormalizeX(t), y: singleLogistic(t, paramsForFit) }));
                yPredicted = dataForFit.map(p => singleLogistic(p.x, paramsForFit));
                const peakY = newFittedData.reduce((max, p) => Math.max(max, p.y), -Infinity);
                const peak = newFittedData.find(p => p.y === peakY) || null;
                newKeyPoints = {peak, sos: newFittedData.find(p => p.y >= paramsForFit.L * 0.1) || null, eos: newFittedData.find(p => p.y >= paramsForFit.L * 0.9) || null };
                break;
            }
            case CurveModel.LOESS: newFittedData = loess(keptData, parameters.span); break;
            case CurveModel.MOVING_AVERAGE: newFittedData = movingAverage(keptData, parameters.windowSize); break;
            case CurveModel.SAVITZKY_GOLAY: newFittedData = savitzkyGolay(keptData, parameters.windowSize); break;
        }

        const isParametric = curveModel === CurveModel.DOUBLE_LOGISTIC || curveModel === CurveModel.SINGLE_LOGISTIC;
        if (!isParametric && newFittedData.length > 0) { if (newFittedData.length === keptData.length) yPredicted = newFittedData.map(p => p.y); newKeyPoints = deriveKeyPointsFromSmoothedData(newFittedData); }
        setFittedData(newFittedData); setKeyPoints(newKeyPoints);
        
        if (yPredicted.length === keptData.length) { const yObserved = keptData.map(p => p.y); const meanY = yObserved.reduce((a, b) => a + b, 0) / yObserved.length; const ssTot = yObserved.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0); const ssRes = yObserved.reduce((sum, y, i) => sum + Math.pow(y - yPredicted[i], 2), 0); const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 1; const rmse = Math.sqrt(ssRes / yObserved.length); setStats({ r2: isNaN(r2) ? 0 : r2, rmse: isNaN(rmse) ? 0 : rmse });
        } else { setStats({ r2: 0, rmse: 0 }); }
    }, [keptData, parameters, curveModel, isDateAxis]);
    
    useEffect(() => { calculateFit(); }, [calculateFit]);

    const handleApplyOutliers = () => {
        setConfirmedRemovedData(prev => [...prev, ...pendingRemovalData]);
        setIsOutlierRemovalEnabled(false);
    };
    const handleResetOutliers = () => {
        setConfirmedRemovedData([]);
    };

    const deriveKeyPointsFromSmoothedData = (data: Point[]): KeyPoints => {
        if (data.length < 3) return { sos: null, eos: null, peak: null };
        const peak = data.reduce((max, p) => p.y > max.y ? p : max, data[0]);
        const baseline = (data[0].y + data[data.length - 1].y) / 2;
        const amplitude = peak.y - baseline;
        const sosThreshold = baseline + amplitude * 0.2;
        const eosThreshold = baseline + amplitude * 0.5;
        const peakIndex = data.indexOf(peak);
        let sos: Point | null = null, eos: Point | null = null;
        for (let i = 0; i < peakIndex; i++) { if (data[i].y >= sosThreshold) { sos = data[i]; break; } }
        for (let i = data.length - 1; i > peakIndex; i--) { if (data[i].y >= eosThreshold) { eos = data[i]; break; } }
        return { peak, sos: sos || data[0], eos: eos || data[data.length-1] };
    };

    const handleStyleChange = (newStyle: Partial<LineStyle & MarkerStyle & TextStyle & BackgroundStyle & { grid: GridStyle }>) => {
        const { target, targetIndex } = stylePickerState;
        if (!target) return;
        
        setStyles(prevStyles => {
            const nextStyles = JSON.parse(JSON.stringify(prevStyles));

            if (target === 'groupingStyles' && targetIndex !== undefined) {
                 const { color, ...sharedChanges } = newStyle;

                // Apply shared changes to all grouping styles, preserving their original color
                nextStyles.groupingStyles = nextStyles.groupingStyles.map((style: LineStyle) => ({
                    ...style,
                    ...sharedChanges
                }));

                // Apply the color change only to the one that was clicked, if color was changed
                if (color !== undefined) {
                    nextStyles.groupingStyles[targetIndex].color = color;
                }
                
                // If font size is being changed, update the shared text style for all labels
                if (newStyle.fontSize !== undefined) {
                    nextStyles.groupingText.fontSize = newStyle.fontSize;
                }
            } else if (target === 'xAxis' || target === 'yAxis') {
                 nextStyles.xAxis = { ...nextStyles.xAxis, ...newStyle };
                 nextStyles.yAxis = { ...nextStyles.yAxis, ...newStyle };
            } else if (target === 'chartBackground') {
                if ('grid' in newStyle && newStyle.grid) {
                    nextStyles.grid = { ...nextStyles.grid, ...newStyle.grid };
                    delete (newStyle as any).grid;
                }
                nextStyles.chartBackground = { ...nextStyles.chartBackground, ...newStyle };

            } else {
                 const key = target as Exclude<StyleTarget, 'groupingStyles' | 'xAxis' | 'yAxis' | 'chartBackground'>;
                 if (typeof nextStyles[key] === 'object' && nextStyles[key] !== null) {
                    (nextStyles[key] as any) = { ...nextStyles[key], ...newStyle };
                 }
            }
            return nextStyles;
        });
    };
    
    const handleOptimize = async () => { 
        const isParametric = curveModel === CurveModel.DOUBLE_LOGISTIC || curveModel === CurveModel.SINGLE_LOGISTIC;
        if (keptData.length === 0 || !isParametric) return; 
        setIsOptimizing(true);
        try { 
            // --- Normalization for Date Axis ---
            const minTimestamp = isDateAxis ? Math.min(...keptData.map(p => p.x)) : 0;
            const normalizeX = (x: number) => isDateAxis ? (x - minTimestamp) / 86400000 : x;
            const denormalizeX = (x: number) => isDateAxis ? (x * 86400000) + minTimestamp : x;
            
            const dataForFit = keptData.map(p => ({...p, x: normalizeX(p.x)}));
            const paramsForFit = {...parameters};
            if(isDateAxis) {
                paramsForFit.start = normalizeX(parameters.start);
                paramsForFit.end = normalizeX(parameters.end);
                paramsForFit.x0 = normalizeX(parameters.x0);
            }
            // --- End Normalization ---

            const modelFunction = curveModel === CurveModel.DOUBLE_LOGISTIC ? doubleLogistic : singleLogistic; 
            const paramKeys: (keyof FitParameters)[] = curveModel === CurveModel.DOUBLE_LOGISTIC ? ['baseline', 'amplitude', 'start', 'end', 'growthRate', 'senescenceRate'] : ['L', 'k', 'x0']; 
            
            const optimizedNormParams = await optimizeParameters(dataForFit, paramsForFit, modelFunction, paramKeys, lockedParams);
            
            const optimizedDenormParams = {...optimizedNormParams};
            if(isDateAxis) {
                optimizedDenormParams.start = denormalizeX(optimizedNormParams.start);
                optimizedDenormParams.end = denormalizeX(optimizedNormParams.end);
                optimizedDenormParams.x0 = denormalizeX(optimizedNormParams.x0);
            }

            setParameters(prev => ({...prev, ...optimizedDenormParams})); 
            setHasUserOptimized(true);
        } catch (error) { 
            console.error("Optimization failed:", error); 
        } finally { 
            setIsOptimizing(false); 
        }
    };
    
    const toggleParamLock = (param: keyof FitParameters) => {
        setLockedParams(prev => {
            const newSet = new Set(prev);
            if (newSet.has(param)) newSet.delete(param);
            else newSet.add(param);
            return newSet;
        });
    };

    const handleDownload = async () => {
        if (!chartContainerRef.current) return;

        const yColName = selectedYCol || 'Y';
        const modelName = curveModel;
        const excelFileName = `phenofit-results-${yColName}-(${modelName}).xlsx`;
        const chartFileName = `phenofit-chart-${yColName}-(${modelName}).png`;

        try {
            const imageSaved = await downloadChartImage(chartContainerRef.current, chartFileName);

            // If the user cancelled the first download, don't proceed to the second.
            if (!imageSaved) {
                console.log("Image download cancelled, aborting subsequent downloads.");
                return;
            }

            await downloadExcelData({
                observed: keptData,
                removed: confirmedRemovedData,
                parameters,
                stats,
                keyPoints,
                groupingData,
                curveModel,
                xColName: selectedXCol || 'X',
                yColName: selectedYCol || 'Y',
            }, excelFileName);
        } catch (error) {
            console.error("Download failed:", error);
            alert(`Download failed. See console for details.`);
        }
    };

    const handleChartElementClick = (e: any, target: StyleTarget, index?: number) => {
        const pickerWidth = 256; const pickerHeight = 450; 
        const clickX = e.clientX ?? e.chartX ?? e.nativeEvent?.clientX ?? window.innerWidth / 2;
        const clickY = e.clientY ?? e.chartY ?? e.nativeEvent?.clientY ?? window.innerHeight / 2;
        
        const top = Math.min(clickY, window.innerHeight - pickerHeight - 20); 
        const left = Math.min(clickX, window.innerWidth - pickerWidth - 20);
        setStylePickerState({ visible: true, top: Math.max(10, top), left: Math.max(10, left), target, targetIndex: index });
    };

    const handleDragStart = (e: React.MouseEvent, target: 'legend' | 'groupingLabel' | 'stylePicker', index?: number, dragInfo?: DragInfo) => {
        e.preventDefault();
        
        let initialPos: DraggablePosition;

        if (target === 'stylePicker') {
            initialPos = { x: stylePickerState.left, y: stylePickerState.top };
        } else if (target === 'legend') {
            initialPos = elementPositions.legend;
        } else { // groupingLabel
            initialPos = elementPositions.groupingLabels[index!] || {x: 0, y: 0};
        }

        setDragState({
            isDragging: true, target, index, dragInfo,
            startX: e.clientX, startY: e.clientY,
            initialX: initialPos.x, initialY: initialPos.y
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragState.isDragging || !dragState.target) return;
        
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        const newX = dragState.initialX + dx;
        const newY = dragState.initialY + dy;

        if (dragState.target === 'stylePicker') {
            setStylePickerState(prev => ({...prev, left: newX, top: newY}));
            return;
        }
        
        setElementPositions(prev => {
            const newPositions = {...prev};
            if (dragState.target === 'legend') {
                newPositions.legend = { x: newX, y: newY };
            } else if (dragState.target === 'groupingLabel' && dragState.index !== undefined) {
                let finalX = newX, finalY = newY;
                if (dragState.dragInfo) {
                    const { areaBounds, labelBase } = dragState.dragInfo;
                    const proposedAbsX = labelBase.x + finalX;
                    const proposedAbsY = labelBase.y + finalY;
                    const textWidthEstimate = 50;
                    const minAllowedX = areaBounds.x + textWidthEstimate / 2;
                    const maxAllowedX = areaBounds.x + areaBounds.width - textWidthEstimate / 2;
                    const minAllowedY = areaBounds.y;
                    const maxAllowedY = areaBounds.y + areaBounds.height - 20;

                    const clampedAbsX = Math.max(minAllowedX, Math.min(proposedAbsX, maxAllowedX));
                    const clampedAbsY = Math.max(minAllowedY, Math.min(proposedAbsY, maxAllowedY));
                    
                    finalX = clampedAbsX - labelBase.x;
                    finalY = clampedAbsY - labelBase.y;
                } else { 
                    finalX = dragState.initialX;
                }
                const newLabels = [...prev.groupingLabels];
                newLabels[dragState.index] = { x: finalX, y: finalY };
                newPositions.groupingLabels = newLabels;
            }
            return newPositions;
        });
    }, [dragState]);

    const handleMouseUp = useCallback(() => {
        setDragState(prev => ({...prev, isDragging: false, target: null}));
    }, []);



    useEffect(() => {
        if (dragState.isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
    }, [dragState.isDragging, handleMouseMove, handleMouseUp]);


    let currentStyleForPicker: Partial<LineStyle & MarkerStyle & TextStyle & BackgroundStyle & { grid: GridStyle }> = {};
    if (stylePickerState.target) {
        if (stylePickerState.target === 'groupingStyles' && stylePickerState.targetIndex !== undefined) {
            currentStyleForPicker = {
                ...styles.groupingStyles[stylePickerState.targetIndex],
                fontSize: styles.groupingText.fontSize,
            };
        } else if (stylePickerState.target === 'chartBackground') {
            currentStyleForPicker = {
                ...styles.chartBackground,
                grid: styles.grid
            }
        } else if (stylePickerState.target in styles) {
            currentStyleForPicker = styles[stylePickerState.target as keyof Omit<ChartStyles, 'groupingStyles'>] || {};
        }
    }


    return (
        <>
            {isGroupingDialogVisible && <GroupingDialog columns={groupingColumns} onSubmit={handleGroupingConfigSubmit} onCancel={() => setIsGroupingDialogVisible(false)} />}
            
            <StylePicker 
                visible={stylePickerState.visible}
                top={stylePickerState.top}
                left={stylePickerState.left}
                target={stylePickerState.target}
                currentStyle={currentStyleForPicker}
                onStyleChange={handleStyleChange}
                onClose={() => setStylePickerState(prev => ({ ...prev, visible: false, target: null }))}
                onDragStart={(e) => handleDragStart(e, 'stylePicker')}
            />

            <div className="h-screen w-screen flex flex-col md:flex-row bg-body-bg font-sans">
                <aside className="w-full md:w-[450px] lg:w-[500px] flex-shrink-0 h-auto md:h-full shadow-lg z-10 bg-panel-bg">
                    <ControlPanel
                        onFileLoad={handleFileLoad} onGroupingFileLoad={handleGroupingFileLoad}
                        onClearGrouping={handleClearGrouping} onReconfigureGrouping={() => setIsGroupingDialogVisible(true)}
                        isGroupingLoaded={!!groupingData} columns={columns}
                        selectedXCol={selectedXCol} setSelectedXCol={setSelectedXCol} selectedYCol={selectedYCol}
                        setSelectedYCol={setSelectedYCol} curveModel={curveModel} setCurveModel={setCurveModel}
                        parameters={parameters} setParameters={setParameters} onOptimize={handleOptimize}
                        showKeyPoints={showKeyPoints} setShowKeyPoints={setShowKeyPoints} isDataLoaded={isDataLoaded}
                        isOptimizing={isOptimizing}
                        lockedParams={lockedParams} toggleParamLock={toggleParamLock}
                        isOutlierRemovalEnabled={isOutlierRemovalEnabled} setIsOutlierRemovalEnabled={setIsOutlierRemovalEnabled}
                        outlierMethod={outlierMethod} setOutlierMethod={setOutlierMethod}
                        outlierThreshold={outlierThreshold} setOutlierThreshold={setOutlierThreshold}
                        pendingOutliersCount={pendingRemovalData.length}
                        confirmedOutliersCount={confirmedRemovedData.length}
                        onApplyOutliers={handleApplyOutliers}
                        onResetOutliers={handleResetOutliers}
                        isDateAxis={isDateAxis}
                        xDomain={xDomain}
                    />
                </aside>
                <main ref={mainAreaRef} className="flex-1 flex flex-col items-stretch justify-start min-h-0 min-w-0">
                    <div ref={chartContainerRef} className="flex-grow flex flex-col items-center justify-center min-h-0 p-4 bg-chart-area-bg">
                        {isDataLoaded ? (
                            <Chart 
                                observedData={keptData} pendingRemovalData={pendingRemovalData}
                                fittedData={fittedData} keyPoints={keyPoints}
                                groupingData={transformedGroupingData} xCol={selectedXCol || 'X-Axis'} yCol={selectedYCol || 'Y-Axis'}
                                showKeyPoints={showKeyPoints} styles={styles} positions={elementPositions}
                                onElementClick={handleChartElementClick} onDragStart={(e, target, index, dragInfo) => handleDragStart(e, target, index, dragInfo)}
                                isDateAxis={isDateAxis} isCircularAxis={isCircularAxis}
                            />
                        ) : (
                            <div className="text-center text-primary bg-chart-area-bg rounded-lg p-10">
                            <h2 className="text-2xl font-semibold">Welcome to PhenoFit Pro</h2>
                            <p className="mt-2 text-muted">Load a data file to begin your analysis.</p>
                            </div>
                        )}
                    </div>
                    {isDataLoaded && (
                        <div className="flex-shrink-0 p-4 pt-0 border-t-2 border-body-bg">
                            <ResultsPanel stats={stats} keyPoints={keyPoints} onDownload={handleDownload} />
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};

export default App;