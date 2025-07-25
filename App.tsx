import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import ControlPanel from './components/ControlPanel';
import Chart from './components/Chart';
import GroupingDialog from './components/GroupingDialog';
import StylePicker from './components/ui/StylePicker';
import SheetSelectionDialog from './components/SheetSelectionDialog';
import ResultsPanel from './components/ResultsPanel';
import ChatPanel from './components/ChatPanel';
import { Point, CurveModel, FitParameters, KeyPoints, GroupingConfig, GroupingData, StylePickerState, StyleTarget, ChartStyles, LineStyle, MarkerStyle, TextStyle, ChartElementPositions, DraggablePosition, BackgroundStyle, OutlierMethod, GridStyle, LegendStyle, ApiService, OpenRouterModel } from './types';
import { doubleLogistic, singleLogistic, loess, movingAverage, savitzkyGolay, optimizeParameters } from './services/curveFitService';
import { downloadChartImage, downloadExcelData } from './services/downloadService';
import { parseCommand } from './services/nluService';

const SPECTRAL_PALETTE = [ '#5e4fa2', '#3288bd', '#66c2a5', '#abdda4', '#e6f598', '#fee08b', '#fdae61', '#f46d43', '#d53e4f', '#9e0142' ];

const initialStyles: ChartStyles = {
    observed: { color: '#000000', shape: 'circle', size: 6, opacity: 0.8 },
    outliers: { color: '#ef4444', shape: 'cross', size: 8, opacity: 0.9 },
    pendingOutliers: { color: '#f97316', shape: 'circle', size: 7, opacity: 0.9 },
    fitted: { color: '#ff0000', strokeWidth: 4, opacity: 1, strokeDasharray: '0' },
    xAxis: { color: '#000000', fontSize: 16, fontWeight: 'bold', fontStyle: 'normal' },
    yAxis: { color: '#000000', fontSize: 16, fontWeight: 'bold', fontStyle: 'normal' },
    groupingText: { color: '#212529', fontSize: 12, fontWeight: 'bold', fontStyle: 'normal' },
    groupingStyles: [],
    showGroupingLabels: false, // Default to false
    legend: {
        color: '#212529',
        fontSize: 12,
        fontWeight: 'normal',
        fontStyle: 'normal',
        iconSize: 16,
        layout: 'vertical',
        backgroundColor: '#FFFFFF',
        backgroundOpacity: 0.9
    },
    chartBackground: { color: '#FFFFFF', opacity: 1 },
    grid: { visible: true, color: '#ADB5BD', strokeDasharray: '3 3' }
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

interface Message {
    text: string;
    sender: 'user' | 'bot';
}

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

    // Data Filtering Options
    const [removeZeroValues, setRemoveZeroValues] = useState(false);
    const [removeNaNValues, setRemoveNaNValues] = useState(true);
    const [removeBlankValues, setRemoveBlankValues] = useState(true);

    // Legend Visibility
    const [showLegend, setShowLegend] = useState(true);

    // Axis Limits
    const [xAxisMin, setXAxisMin] = useState<number | undefined>(undefined);
    const [xAxisMax, setXAxisMax] = useState<number | undefined>(undefined);
    const [yAxisMin, setYAxisMin] = useState<number | undefined>(undefined);
    const [yAxisMax, setYAxisMax] = useState<number | undefined>(undefined);

    const [xAxisMinStr, setXAxisMinStr] = useState('');
    const [xAxisMaxStr, setXAxisMaxStr] = useState('');

    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
    const [legendSize, setLegendSize] = useState({ width: 240, height: 80 });
    const [isLegendManuallyPositioned, setIsLegendManuallyPositioned] = useState(false);

    // Chat State
    const [chatMessages, setChatMessages] = useState<Message[]>([]);
    const [isChatProcessing, setIsChatProcessing] = useState(false);
    const [apiService, setApiService] = useState<ApiService>(ApiService.OPENROUTER);
    const [selectedModel, setSelectedModel] = useState<string>(OpenRouterModel.MISTRAL_7B_INSTRUCT);

    const handleLegendSizeChange = useCallback((size: { width: number; height: number }) => {
        setLegendSize(size);
    }, []);

    // Excel Sheet Selection State
    const [isSheetSelectionVisible, setIsSheetSelectionVisible] = useState(false);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [excelWorkbook, setExcelWorkbook] = useState<XLSX.WorkBook | null>(null);

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

    // UI & Chart State
    const [fittedData, setFittedData] = useState<Point[]>([]);
    const [keyPoints, setKeyPoints] = useState<KeyPoints>({ sos: null, eos: null, peak: null });
    const [stats, setStats] = useState({ r2: 0, rmse: 0 });
    const [showKeyPoints, setShowKeyPoints] = useState(true);
    const [styles, setStyles] = useState<ChartStyles>(initialStyles);
    const [stylePickerState, setStylePickerState] = useState<Omit<StylePickerState, 'currentStyle'>>({ visible: false, top: 0, left: 0, target: null });
    const [elementPositions, setElementPositions] = useState<ChartElementPositions>({
        legend: { x: 0, y: 0 }, // Will be set after mount
        groupingLabels: []
    });
    const [dragState, setDragState] = useState<DragState>({isDragging: false, target: null, startX: 0, startY: 0, initialX: 0, initialY: 0});
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const mainAreaRef = useRef<HTMLDivElement>(null);
    const resultsPanelRef = useRef<HTMLDivElement>(null);
    const wasDragged = useRef(false);

    // Loading State
    const [isOptimizing, setIsOptimizing] = useState(false);
    const isDataLoaded = rawData.length > 0;

    // Derived state for chart axis type
    const isDateAxis = /date/i.test(selectedXCol);
    const isCircularAxis = /doy|day of year/i.test(selectedXCol);

    const [xAxisLabel, setXAxisLabel] = useState(selectedXCol || 'X-Axis');
    const [yAxisLabel, setYAxisLabel] = useState(selectedYCol || 'Y-Axis');
    const [previousState, setPreviousState] = useState<any>(null);

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

    const processLoadedData = (data: any[]) => {
        if (!data || data.length === 0) return alert("File is empty.");
        
        setLockedParams(new Set());
        setRawData(data);
        const cols = Object.keys(data[0] || {});
        setColumns(cols);

        const findColumn = (patterns: RegExp[]) => {
            for (const pattern of patterns) {
                const col = cols.find(c => pattern.test(c));
                if (col) return col;
            }
            return null;
        };

        const xCol = findColumn([/das|days after sowing/i, /doy|day of year/i, /date/i]) || cols[0] || '';
        const yCol = findColumn([/gcc/i, /ndvi/i, /ndre/i]) || (cols.length > 1 ? cols[1] : '');

        setSelectedXCol(xCol);
        setSelectedYCol(yCol);

        handleClearGrouping();
        setConfirmedRemovedData([]);
    };

    const readFile = (file: File, callback: (data: any[]) => void) => {
        const fileType = file.name.split('.').pop()?.toLowerCase();
        if (fileType === 'csv') {
            Papa.parse(file, { header: true, dynamicTyping: true, skipEmptyLines: true, complete: (res: Papa.ParseResult<any>) => callback(res.data as any[]), error: (err: Papa.ParseError) => alert(`Error: ${err.message}`) });
        } else if (fileType === 'xlsx' || fileType === 'xls' || fileType === 'xlsm' || fileType === 'xlsb') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const workbook = XLSX.read(e.target?.result, { type: 'array', cellDates: true });
                    if (workbook.SheetNames.length > 1) {
                        setExcelWorkbook(workbook);
                        setSheetNames(workbook.SheetNames);
                        setIsSheetSelectionVisible(true);
                    } else {
                        callback(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]));
                    }
                } catch (err) {
                    console.error("Error parsing Excel file:", err);
                    alert(`Error parsing Excel: ${err instanceof Error ? err.message : 'Unknown'}`);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert("Unsupported file type.");
        }
    };

    const handleFileLoad = (file: File) => readFile(file, (_data) => {
        processLoadedData(_data);
    });

    const handleGroupingFileLoad = (file: File) => readFile(file, (data) => {
        if (!data || data.length === 0) return alert("Grouping file is empty.");
        setGroupingRawData(data);
        setGroupingColumns(Object.keys(data[0] || {}));
        setIsGroupingDialogVisible(true);
    });

    const handleClearGrouping = () => { setGroupingData(null); setGroupingRawData(null); setGroupingColumns([]); setStyles((prev: ChartStyles) => ({...prev, groupingStyles: []})); setElementPositions((prev: ChartElementPositions) => ({ ...prev, groupingLabels: [] }));};

    const handleGroupingConfigSubmit = (config: GroupingConfig) => {
        if (!groupingRawData) return;
        const newGroupingData = groupingRawData.map((row: any) => {
            const startVal = isDateAxis ? parseDateValue(row[config.startCol]) : parseFloat(row[config.startCol]);
            const endVal = (config.endCol && row[config.endCol] != null)
                ? (isDateAxis ? parseDateValue(row[config.endCol]) : parseFloat(row[config.endCol]))
                : null;
            const group: any = {
                start: startVal,
                end: endVal,
            };
            if (config.labelCol) {
                const labelValue = row[config.labelCol];
                const labelString = (typeof labelValue === 'object' && labelValue !== null)
                    ? JSON.stringify(labelValue)
                    : String(labelValue ?? '');
                group.label = labelString;
            }
            return group;
        }).filter((g: any) => g.start != null && !isNaN(g.start));

        const isEventOnly = config.endCol === null;
        const newGroupingStyles = newGroupingData.map((_: any, index: number) => ({
            color: SPECTRAL_PALETTE[index % SPECTRAL_PALETTE.length],
            strokeWidth: isEventOnly ? 3 : 2,
            opacity: 0.4,
            strokeDasharray: isEventOnly ? '5 5' : '0'
        }));

        setGroupingData(newGroupingData as GroupingData[]);
        setStyles((prev: ChartStyles) => ({...prev, groupingStyles: newGroupingStyles }));
        setElementPositions((prev: ChartElementPositions) => ({...prev, groupingLabels: newGroupingData.map(() => ({x: 0, y: 0})) }));
        setIsGroupingDialogVisible(false);
    };

    const processedData = useMemo(() => {
        let parsedData: Point[] = rawData.map((row: any): Omit<Point, 'x'> & { x: number | null } => {
            const xVal = row[selectedXCol];
            const yVal = row[selectedYCol];
            return {
                x: isDateAxis ? parseDateValue(xVal) : parseFloat(xVal),
                y: parseFloat(yVal),
                originalX: xVal
            };
        }).filter((p): p is Point => {
            const isValid = p.x != null && p.y != null && !isNaN(p.x) && !isNaN(p.y);
            if (!isValid) return false;

            if (removeZeroValues && p.y === 0) return false;
            if (removeNaNValues && isNaN(p.y)) return false;
            if (removeBlankValues && (p.originalX === '' || p.originalX === null || p.originalX === undefined || p.y === null || p.y === undefined)) return false;

            return true;
        });

        if (!isCircularAxis) {
            parsedData.sort((a, b) => a.x - b.x);
        }

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

        const dataToScan = transformedData.filter(p => !confirmedRemovedData.find((rem: Point) => rem.originalX === p.originalX && rem.y === p.y));
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

        const pendingRemovalData = Array.from(pendingOutliers);
        const keptData = transformedData.filter(p => !confirmedRemovedData.find((rem: Point) => rem.originalX === p.originalX && rem.y === p.y));
        const xDomain: [number, number] | null = transformedData.length > 0 ? [Math.min(...transformedData.map(p => p.x)), Math.max(...transformedData.map(p => p.x))] : null;

        return { keptData, pendingRemovalData, transformedGrouping, xDomain };

    }, [rawData, selectedXCol, selectedYCol, isDateAxis, isCircularAxis, groupingData, isOutlierRemovalEnabled, outlierMethod, outlierThreshold, confirmedRemovedData, removeZeroValues, removeNaNValues, removeBlankValues]);

    useEffect(() => {
        if (isDateAxis) {
            const min = parseDateValue(xAxisMinStr);
            const max = parseDateValue(xAxisMaxStr);
            setXAxisMin(min ?? undefined);
            setXAxisMax(max ?? undefined);
        } else {
            setXAxisMin(xAxisMinStr === '' ? undefined : parseFloat(xAxisMinStr));
            setXAxisMax(xAxisMaxStr === '' ? undefined : parseFloat(xAxisMaxStr));
        }
    }, [xAxisMinStr, xAxisMaxStr, isDateAxis]);

    const { keptData, pendingRemovalData, transformedGrouping: transformedGroupingData, xDomain } = processedData;

    useEffect(() => {
        if (keptData.length > 0) {
            const smartParams = estimateSmartParameters(keptData, isDateAxis);
            setParameters((prev: FitParameters) => ({ ...prev, ...smartParams }));
        }
    }, [keptData, isDateAxis, estimateSmartParameters, selectedXCol, selectedYCol]);

    const calculateFit = useCallback(() => {
        if (keptData.length === 0) { setFittedData([]); setKeyPoints({ sos: null, eos: null, peak: null }); setStats({ r2: 0, rmse: 0 }); return; }

        let newFittedData: Point[] = [], yPredicted: number[] = [], newKeyPoints: KeyPoints = { sos: null, eos: null, peak: null };

        const minTimestamp = isDateAxis ? Math.min(...keptData.map((p: Point) => p.x)) : 0;
        const normalizeX = (x: number) => isDateAxis ? (x - minTimestamp) / 86400000 : x;
        const denormalizeX = (x: number) => isDateAxis ? (x * 86400000) + minTimestamp : x;

        const dataForFit = keptData.map((p: Point) => ({...p, x: normalizeX(p.x)}));
        const paramsForFit = {...parameters};
        if(isDateAxis) {
            paramsForFit.start = normalizeX(parameters.start);
            paramsForFit.end = normalizeX(parameters.end);
            paramsForFit.x0 = normalizeX(parameters.x0);
        }

        const xRange = dataForFit.map((p: Point) => p.x);
        const tFit = Array.from({ length: 200 }, (_, i) => Math.min(...xRange) + i * (Math.max(...xRange) - Math.min(...xRange)) / 199);

        switch(curveModel) {
            case CurveModel.DOUBLE_LOGISTIC: {
                newFittedData = tFit.map(t => ({ x: denormalizeX(t), y: doubleLogistic(t, paramsForFit) }));
                yPredicted = dataForFit.map((p: Point) => doubleLogistic(p.x, paramsForFit));
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
                yPredicted = dataForFit.map((p: Point) => singleLogistic(p.x, paramsForFit));
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

        if (yPredicted.length === keptData.length) { const yObserved = keptData.map((p: Point) => p.y); const meanY = yObserved.reduce((a: number, b: number) => a + b, 0) / yObserved.length; const ssTot = yObserved.reduce((sum: number, y: number) => sum + Math.pow(y - meanY, 2), 0); const ssRes = yObserved.reduce((sum: number, y: number, i: number) => sum + Math.pow(y - yPredicted[i], 2), 0); const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 1; const rmse = Math.sqrt(ssRes / yObserved.length); setStats({ r2: isNaN(r2) ? 0 : r2, rmse: isNaN(rmse) ? 0 : rmse });
        } else { setStats({ r2: 0, rmse: 0 }); }
    }, [keptData, parameters, curveModel, isDateAxis]);

    useEffect(() => { calculateFit(); }, [calculateFit]);

    const handleApplyOutliers = () => {
        setConfirmedRemovedData((prev: Point[]) => [...prev, ...pendingRemovalData]);
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

        setStyles((prevStyles: ChartStyles) => {
            const nextStyles = JSON.parse(JSON.stringify(prevStyles));

            if (target === 'groupingStyles' && targetIndex !== undefined) {
                const updatedGroupingStyle = { ...nextStyles.groupingStyles[targetIndex] };
                const updatedGroupingText = { ...nextStyles.groupingText };

                if ('strokeWidth' in newStyle) updatedGroupingStyle.strokeWidth = newStyle.strokeWidth as number;
                if ('strokeDasharray' in newStyle) updatedGroupingStyle.strokeDasharray = newStyle.strokeDasharray as string;
                if ('opacity' in newStyle) updatedGroupingStyle.opacity = newStyle.opacity as number;
                if ('color' in newStyle) updatedGroupingText.color = newStyle.color as string;
                if ('fontSize' in newStyle) updatedGroupingText.fontSize = newStyle.fontSize as number;
                if ('fontWeight' in newStyle) updatedGroupingText.fontWeight = newStyle.fontWeight as 'normal' | 'bold';
                if ('fontStyle' in newStyle) updatedGroupingText.fontStyle = newStyle.fontStyle as 'normal' | 'italic';

                nextStyles.groupingStyles[targetIndex] = updatedGroupingStyle;
                nextStyles.groupingText = updatedGroupingText;

            } else if (target === 'xAxis' || target === 'yAxis') {
                 nextStyles[target] = { ...nextStyles[target], ...newStyle };
            } else if (target === 'chartBackground') {
                if ('grid' in newStyle && newStyle.grid) {
                    nextStyles.grid = { ...nextStyles.grid, ...newStyle.grid };
                    delete (newStyle as any).grid;
                }
                nextStyles.chartBackground = { ...nextStyles.chartBackground, ...newStyle };

            } else {
                 const key = target as Exclude<StyleTarget, 'groupingStyles' | 'xAxis' | 'yAxis' | 'chartBackground'>;
                 if (key === 'legend' && 'showGroupingLabels' in newStyle) {
                    nextStyles.showGroupingLabels = newStyle.showGroupingLabels as boolean;
                    delete (newStyle as any).showGroupingLabels;
                 }
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
            const minTimestamp = isDateAxis ? Math.min(...keptData.map((p: Point) => p.x)) : 0;
            const normalizeX = (x: number) => isDateAxis ? (x - minTimestamp) / 86400000 : x;
            const denormalizeX = (x: number) => isDateAxis ? (x * 86400000) + minTimestamp : x;

            const dataForFit = keptData.map((p: Point) => ({...p, x: normalizeX(p.x)}));
            const paramsForFit = {...parameters};
            if(isDateAxis) {
                paramsForFit.start = normalizeX(parameters.start);
                paramsForFit.end = normalizeX(parameters.end);
                paramsForFit.x0 = normalizeX(parameters.x0);
            }

            const modelFunction = curveModel === CurveModel.DOUBLE_LOGISTIC ? doubleLogistic : singleLogistic;
            const paramKeys: (keyof FitParameters)[] = curveModel === CurveModel.DOUBLE_LOGISTIC ? ['baseline', 'amplitude', 'start', 'end', 'growthRate', 'senescenceRate'] : ['L', 'k', 'x0'];

            const optimizedNormParams = await optimizeParameters(dataForFit, paramsForFit, modelFunction, paramKeys, lockedParams);

            const optimizedDenormParams = {...optimizedNormParams};
            if(isDateAxis) {
                optimizedDenormParams.start = denormalizeX(optimizedNormParams.start);
                optimizedDenormParams.end = denormalizeX(optimizedNormParams.end);
                optimizedDenormParams.x0 = denormalizeX(optimizedNormParams.x0);
            }

            setParameters((prev: FitParameters) => ({...prev, ...optimizedDenormParams}));
            
        } catch (error) {
            console.error("Optimization failed:", error);
        } finally {
            setIsOptimizing(false);
        }
    };

    const toggleParamLock = (param: keyof FitParameters) => {
        setLockedParams((prev: Set<keyof FitParameters>) => {
            const newSet = new Set(prev);
            if (newSet.has(param)) newSet.delete(param);
            else newSet.add(param);
            return newSet;
        });
    };

        const handleDownload = async () => {
        if (!chartContainerRef.current || !mainAreaRef.current) return;

        const yColName = selectedYCol || 'Y';
        const modelName = curveModel;
        const excelFileName = `phenofit-results-${yColName}-(${modelName}).xlsx`;
        const chartFileName = `phenofit-chart-${yColName}-(${modelName}).png`;

        // Determine which element to capture
        const chartRect = chartContainerRef.current.getBoundingClientRect();
        const legendPos = elementPositions.legend;
        const { width: legendW, height: legendH } = legendSize;

        const isLegendInsideChart = 
            legendPos.x >= 0 &&
            legendPos.y >= 0 &&
            (legendPos.x + legendW) <= chartRect.width &&
            (legendPos.y + legendH) <= chartRect.height;

        const elementToCapture = isLegendInsideChart ? chartContainerRef.current : mainAreaRef.current;

        try {
            const imageSaved = await downloadChartImage(elementToCapture, chartFileName);

            if (!imageSaved) {
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
        if (wasDragged.current) { return; }
        const pickerWidth = 256; const pickerHeight = 450;
        const clickX = e.clientX ?? e.chartX ?? e.nativeEvent?.clientX ?? window.innerWidth / 2;
        const clickY = e.clientY ?? e.chartY ?? e.nativeEvent?.clientY ?? window.innerHeight / 2;

        const top = Math.min(clickY, window.innerHeight - pickerHeight - 20);
        const left = Math.min(clickX, window.innerWidth - pickerWidth - 20);
        setStylePickerState({ visible: true, top: Math.max(10, top), left: Math.max(10, left), target, targetIndex: index });
    };

    const handleDragStart = (e: React.MouseEvent, target: 'legend' | 'groupingLabel' | 'stylePicker', index?: number, dragInfo?: DragInfo) => {
        e.preventDefault();
        wasDragged.current = false;
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
        wasDragged.current = true;

        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        let newX = dragState.initialX + dx;
        let newY = dragState.initialY + dy;

        if (dragState.target === 'stylePicker') {
            setStylePickerState((prev: Omit<StylePickerState, 'currentStyle'>) => ({...prev, left: newX, top: newY}));
            return;
        }
        if (dragState.target === 'legend') {
            const chartRect = chartContainerRef.current?.getBoundingClientRect();
            const mainRect = mainAreaRef.current?.getBoundingClientRect();

            if (chartRect && mainRect && isRightPanelOpen) { // Only constrain when right panel is open
                const minX = mainRect.left - chartRect.left;
                const maxX = mainRect.right - chartRect.left - legendSize.width;
                const minY = mainRect.top - chartRect.top;
                const maxY = mainRect.bottom - chartRect.top - legendSize.height;

                newX = Math.max(minX, Math.min(newX, maxX));
                newY = Math.max(minY, Math.min(newY, maxY));
            }
            setElementPositions(prev => ({...prev, legend: { x: newX, y: newY } }));
            return;
        }
        
        if (dragState.target === 'groupingLabel' && dragState.index !== undefined) {
            if (dragState.dragInfo) { // This is a ReferenceArea label
                const { areaBounds, labelBase } = dragState.dragInfo;
                
                // Constrain within the reference area's viewport coordinates
                const minX = areaBounds.x - labelBase.x;
                const maxX = areaBounds.x + areaBounds.width - labelBase.x;
                const minY = areaBounds.y - labelBase.y;
                const maxY = areaBounds.y + areaBounds.height - labelBase.y;

                newX = Math.max(minX, Math.min(newX, maxX));
                newY = Math.max(minY, Math.min(newY, maxY));

            } else { // This is a ReferenceLine label, restrict to Y-axis movement
                newX = dragState.initialX; // Keep original X
            }
            
            setElementPositions((prev: ChartElementPositions) => {
                const newPositions = {...prev};
                const newLabels = [...prev.groupingLabels];
                newLabels[dragState.index] = { x: newX, y: newY };
                newPositions.groupingLabels = newLabels;
                return newPositions;
            });
            return;
        }

        setElementPositions((prev: ChartElementPositions) => {
            const newPositions = {...prev};
            if (dragState.target === 'groupingLabel' && dragState.index !== undefined) {
                const newLabels = [...prev.groupingLabels];
                newLabels[dragState.index] = { x: newX, y: newY };
                newPositions.groupingLabels = newLabels;
            }
            return newPositions;
        });
    }, [dragState, isRightPanelOpen, legendSize.height, legendSize.width]);

    const handleMouseUp = useCallback(() => {
        setDragState((prev: DragState) => ({...prev, isDragging: false, target: null}));
        setTimeout(() => { wasDragged.current = false; }, 50);
    }, []);

    const handleSheetSelect = (sheetName: string) => {
        if (excelWorkbook) {
            const data = XLSX.utils.sheet_to_json(excelWorkbook.Sheets[sheetName]);
            processLoadedData(data);
            setIsSheetSelectionVisible(false);
            setExcelWorkbook(null);
            setSheetNames([]);
        }
    };

    const handleSheetSelectionCancel = () => {
        setIsSheetSelectionVisible(false);
        setExcelWorkbook(null);
        setSheetNames([]);
    };

    const handleSendMessage = async (message: string, _service: ApiService) => {
        const newMessages: Message[] = [...chatMessages, { text: message, sender: 'user' }];
        setChatMessages(newMessages);
        setIsChatProcessing(true);

        // Save current state for potential revert
        setPreviousState({
            styles,
            xAxisLabel,
            yAxisLabel,
            showLegend,
            showKeyPoints,
            xAxisMin,
            xAxisMax,
            yAxisMin,
            yAxisMax,
            parameters,
            lockedParams
        });

        try {
            const modelConfig = {
                service: apiService,
                modelName: selectedModel
            };
            const nluResponse = await parseCommand(message, columns, styles, modelConfig);
            let botResponse = nluResponse.response || "I have processed your request.";

            for (const intent of nluResponse.actions) {
                switch (intent.action) {
                    case 'PLOT':
                        if (intent.payload.x_column && intent.payload.y_column) {
                            setSelectedXCol(intent.payload.x_column);
                            setSelectedYCol(intent.payload.y_column);
                        } else {
                            botResponse = "I understood you want to plot, but I couldn't identify the X and Y columns. Please be more specific, like 'plot NDVI vs Date'.";
                        }
                        break;

                    case 'STYLE':
                        if (intent.payload.target && intent.payload.properties) {
                            const newProperties = { ...intent.payload.properties };
                            console.log("App.tsx: Received properties from NLU:", newProperties);
                            setStyles(prev => ({
                                ...prev,
                                [intent.payload.target]: { ...prev[intent.payload.target], ...newProperties }
                            }));
                        } else {
                            botResponse = "I understood you want to change a style, but I couldn't determine what to change.";
                        }
                        break;

                    case 'SET_AXIS':
                        if (intent.payload.axis === 'x') {
                            if (intent.payload.min !== undefined) setXAxisMinStr(String(intent.payload.min));
                            if (intent.payload.max !== undefined) setXAxisMaxStr(String(intent.payload.max));
                        } else if (intent.payload.axis === 'y') {
                            if (intent.payload.min !== undefined) setYAxisMin(intent.payload.min);
                            if (intent.payload.max !== undefined) setYAxisMax(intent.payload.max);
                        }
                        break;

                    case 'TOGGLE_VISIBILITY':
                        if (intent.payload.element === 'legend') {
                            setShowLegend(intent.payload.visible);
                        } else if (intent.payload.element === 'keyPoints') {
                            setShowKeyPoints(intent.payload.visible);
                        }
                        break;

                    case 'OPTIMIZE':
                        console.log("Chatbot triggered OPTIMIZE action.");
                        handleOptimize();
                        break;

                    case 'SET_LABEL':
                        if (intent.payload.axis === 'x') {
                            setXAxisLabel(intent.payload.text);
                        } else if (intent.payload.axis === 'y') {
                            setYAxisLabel(intent.payload.text);
                        }
                        break;

                    case 'MOVE_ELEMENT':
                        if (intent.payload.element === 'legend') {
                            const chartRect = chartContainerRef.current?.getBoundingClientRect();
                            if (chartRect) {
                                let newX = elementPositions.legend.x;
                                let newY = elementPositions.legend.y;
                                const padding = 20;

                                switch (intent.payload.position) {
                                    case 'top left':
                                        newX = padding;
                                        newY = padding;
                                        break;
                                    case 'top right':
                                        newX = chartRect.width - legendSize.width - padding;
                                        newY = padding;
                                        break;
                                    case 'bottom left':
                                        newX = padding;
                                        newY = chartRect.height - legendSize.height - padding;
                                        break;
                                    case 'bottom right':
                                        newX = chartRect.width - legendSize.width - padding;
                                        newY = chartRect.height - legendSize.height - padding;
                                        break;
                                }
                                setElementPositions(prev => ({...prev, legend: { x: newX, y: newY } }));
                                setIsLegendManuallyPositioned(true);
                            }
                        }
                        break;

                    case 'SET_PARAMETER':
                        if (intent.payload.parameter && intent.payload.value !== undefined) {
                            setParameters(prev => ({ ...prev, [intent.payload.parameter]: intent.payload.value }));
                            botResponse = `OK, I've set ${intent.payload.parameter} to ${intent.payload.value}.`;
                        } else {
                            botResponse = "I couldn't set the parameter. Please specify both the parameter name and value.";
                        }
                        break;

                    case 'TOGGLE_PARAM_LOCK':
                        if (intent.payload.parameter) {
                            const paramToLock = intent.payload.parameter as keyof FitParameters;
                            setLockedParams(prev => {
                                const newSet = new Set(prev);
                                if (intent.payload.locked) {
                                    newSet.add(paramToLock);
                                    botResponse = `OK, I've locked the ${paramToLock} parameter.`;
                                } else {
                                    newSet.delete(paramToLock);
                                    botResponse = `OK, I've unlocked the ${paramToLock} parameter.`;
                                }
                                return newSet;
                            });
                        } else {
                            botResponse = "I couldn't toggle the lock for the parameter. Please specify the parameter name.";
                        }
                        break;

                    case 'REVERT':
                        if (previousState) {
                            setStyles(previousState.styles);
                            setXAxisLabel(previousState.xAxisLabel);
                            setYAxisLabel(previousState.yAxisLabel);
                            setShowLegend(previousState.showLegend);
                            setShowKeyPoints(previousState.showKeyPoints);
                            setXAxisMin(previousState.xAxisMin);
                            setXAxisMax(previousState.xAxisMax);
                            setYAxisMin(previousState.yAxisMin);
                            setYAxisMax(previousState.yAxisMax);
                            setParameters(previousState.parameters);
                            setLockedParams(previousState.lockedParams);
                        } else {
                            botResponse = "There is nothing to revert.";
                        }
                        break;

                    default: // UNKNOWN
                        // The botResponse is already set from the intent
                        break;
                }
            }

            setChatMessages([...newMessages, { text: botResponse, sender: 'bot' }]);
        } catch (error) {
            console.error("Error processing command:", error);
            if (error instanceof Error) {
                setChatMessages([...newMessages, { text: `Sorry, a critical error occurred: ${error.message}. Please check the console for details.`, sender: 'bot' }]);
            } else {
                setChatMessages([...newMessages, { text: "Sorry, a critical error occurred. Please check the console for details.", sender: 'bot' }]);
            }
        } finally {
            setIsChatProcessing(false);
        }
    };

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

    useEffect(() => { setXAxisLabel(selectedXCol || 'X-Axis'); }, [selectedXCol]);
    useEffect(() => {
        setYAxisLabel(selectedYCol || 'Y-Axis');
        setYAxisMin(undefined);
        setYAxisMax(undefined);
    }, [selectedYCol]);

    // Effect to dynamically position the legend based on right panel state
    useEffect(() => {
        if (!isLegendManuallyPositioned && chartContainerRef.current) {
            const chartRect = chartContainerRef.current.getBoundingClientRect();
            let newX, newY;

            if (isRightPanelOpen) {
                // Position inside chart area (e.g., top-right corner with some padding)
                newX = chartRect.width - legendSize.width - 20; // 20px padding from right
                newY = 20; // 20px padding from top
            } else {
                // Position to the right of the chart area
                newX = chartRect.width + 20; // 20px padding from chart right edge
                newY = 20; // Align with top of chart
            }
            setElementPositions(prev => ({ ...prev, legend: { x: newX, y: newY } }));
        }
    }, [isRightPanelOpen, isLegendManuallyPositioned, legendSize, chartContainerRef]);


    let currentStyleForPicker: Partial<LineStyle & MarkerStyle & TextStyle & BackgroundStyle & LegendStyle & GridStyle & { showGroupingLabels?: boolean }>;
    if (stylePickerState.target) {
        if (stylePickerState.target === 'groupingStyles' && stylePickerState.targetIndex !== undefined) {
            currentStyleForPicker = {
                ...styles.groupingStyles[stylePickerState.targetIndex],
                ...styles.groupingText,
            };
        } else if (stylePickerState.target === 'chartBackground') {
            currentStyleForPicker = {
                ...styles.chartBackground,
                grid: styles.grid
            }
        } else if (stylePickerState.target === 'legend') {
            currentStyleForPicker = {
                ...styles.legend,
                showGroupingLabels: styles.showGroupingLabels
            }
        } else if (stylePickerState.target in styles) {
            currentStyleForPicker = styles[stylePickerState.target as keyof Omit<ChartStyles, 'groupingStyles' | 'showGroupingLabels' | 'groupingText'>] || {};
        }
    }

    const logoSrc = useMemo(() => `${import.meta.env.BASE_URL || '/'}Pheno_Fit_Pro_Logo_2MB.png`, []);


    return (
        <>
            {isGroupingDialogVisible && <GroupingDialog columns={groupingColumns} onSubmit={handleGroupingConfigSubmit} onCancel={() => setIsGroupingDialogVisible(false)} />}
            {isSheetSelectionVisible && (
                <SheetSelectionDialog
                    sheetNames={sheetNames}
                    onSelect={handleSheetSelect}
                    onCancel={handleSheetSelectionCancel}
                />
            )}

            <StylePicker
                visible={stylePickerState.visible}
                top={stylePickerState.top}
                left={stylePickerState.left}
                target={stylePickerState.target}
                currentStyle={currentStyleForPicker}
                onStyleChange={handleStyleChange}
                onClose={() => setStylePickerState((prev) => ({ ...prev, visible: false, target: null }))}
                onDragStart={(e: React.MouseEvent) => handleDragStart(e, 'stylePicker')}
                xAxisLabel={xAxisLabel}
                yAxisLabel={yAxisLabel}
                setXAxisLabel={setXAxisLabel}
                setYAxisLabel={setYAxisLabel}
            />

            <div className="h-screen w-screen flex bg-body-bg font-sans">
                {/* Left Control Panel */}
                <aside className="w-[450px] flex-shrink-0 h-full shadow-lg z-20 bg-panel-bg overflow-y-auto">
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
                
                {/* Center Area (Chart + Results) */}
                <div className="flex-1 flex flex-col min-w-0">
                    <main ref={mainAreaRef} className="flex-grow w-full flex items-center justify-center relative bg-chart-area-bg p-4 min-h-0">
                        {isDataLoaded ? (
                            <div className="w-[700px] h-[700px] flex-shrink-0">
                                <div ref={chartContainerRef} className="w-full h-full relative">
                                    <Chart
                                        observedData={keptData}
                                        pendingRemovalData={pendingRemovalData}
                                        fittedData={fittedData}
                                        keyPoints={keyPoints}
                                        groupingData={transformedGroupingData}
                                        xCol={selectedXCol}
                                        yCol={selectedYCol}
                                        showKeyPoints={showKeyPoints}
                                        styles={styles}
                                        positions={elementPositions}
                                        onElementClick={handleChartElementClick}
                                        onDragStart={handleDragStart}
                                        isDateAxis={isDateAxis}
                                        isCircularAxis={isCircularAxis}
                                        chartAreaRef={chartContainerRef}
                                        xAxisLabel={xAxisLabel}
                                        yAxisLabel={yAxisLabel}
                                        onAxisLabelClick={(axis) => handleChartElementClick({}, axis === 'x' ? 'xAxis' : 'yAxis')}
                                        showLegend={showLegend}
                                        xAxisDomain={[xAxisMin, xAxisMax]}
                                        yAxisDomain={[yAxisMin, yAxisMax]}
                                        onLegendSizeChange={handleLegendSizeChange}
                                        isRightPanelOpen={isRightPanelOpen}
                                        isLegendManuallyPositioned={isLegendManuallyPositioned}
                                        setIsLegendManuallyPositioned={setIsLegendManuallyPositioned}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-200">
                                <div className="absolute inset-0 bg-repeat bg-center opacity-5" style={{backgroundImage: `url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="%239C92AC" fill-opacity="0.1"><path d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/></g></g></svg>')`}}></div>
                                <div className="relative text-center p-8 animate-fade-in-up">
                                    <img src={logoSrc} alt="PhenoFit Pro Logo" className="w-56 h-56 mb-6 mx-auto drop-shadow-2xl" />
                                    <h2 className="text-4xl font-bold text-gray-800 tracking-tight">Welcome to PhenoFit Pro</h2>
                                    <p className="mt-4 text-lg text-gray-600 max-w-md mx-auto">Your professional solution for analyzing phenological data with advanced curve fitting models.</p>
                                    <p className="mt-8 text-md text-gray-500">To get started, please load a data file using the panel on the left.</p>
                                </div>
                            </div>
                        )}
                    </main>
                    {isDataLoaded && (
                        <div className="flex-shrink-0 border-t-2 border-body-bg bg-white">
                           <ResultsPanel
                                ref={resultsPanelRef}
                                stats={stats}
                                keyPoints={keyPoints}
                                parameters={parameters}
                                curveModel={curveModel}
                                isDateAxis={isDateAxis}
                                isDataLoaded={isDataLoaded}
                                onDownload={handleDownload}
                            />
                        </div>
                    )}
                </div>
                
                {/* Right Options Panel */}
                <div className={`relative h-full bg-panel-bg transition-all duration-300 ease-in-out ${isDataLoaded ? '' : 'hidden'} ${isRightPanelOpen ? 'w-[350px]' : 'w-[40px]'} shadow-lg z-10 overflow-hidden`}>
                    {isRightPanelOpen && (
                        <div className="p-4 text-on-panel-primary h-full flex flex-col">
                            {/* Chart Options Section */}
                            <div>
                                <h3 className="text-lg font-bold mb-4">Chart Options</h3>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-md font-semibold mb-2">Data Filtering</h4>
                                        <div className="flex items-center">
                                            <input type="checkbox" id="removeZeroValues" checked={removeZeroValues} onChange={e => setRemoveZeroValues(e.target.checked)} className="mr-2" />
                                            <label htmlFor="removeZeroValues" className="text-on-panel-secondary">Remove 0 values</label>
                                        </div>
                                        <div className="flex items-center">
                                            <input type="checkbox" id="removeNaNValues" checked={removeNaNValues} onChange={e => setRemoveNaNValues(e.target.checked)} className="mr-2" />
                                            <label htmlFor="removeNaNValues" className="text-on-panel-secondary">Remove NaN values</label>
                                        </div>
                                        <div className="flex items-center">
                                            <input type="checkbox" id="removeBlankValues" checked={removeBlankValues} onChange={e => setRemoveBlankValues(e.target.checked)} className="mr-2" />
                                            <label htmlFor="removeBlankValues" className="text-on-panel-secondary">Remove blank values</label>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-md font-semibold mb-2">Legend</h4>
                                        <div className="flex items-center">
                                            <input type="checkbox" id="showLegend" checked={showLegend} onChange={e => setShowLegend(e.target.checked)} className="mr-2" />
                                            <label htmlFor="showLegend" className="text-on-panel-secondary">Show Legend</label>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-md font-semibold mb-2">Axis Limits</h4>
                                        <div className="flex flex-col space-y-2">
                                            <label className="text-on-panel-secondary">X-Axis Min/Max:</label>
                                            <div className="flex space-x-2">
                                                <input type="text" value={xAxisMinStr} onChange={e => setXAxisMinStr(e.target.value)} className="border p-1 rounded w-1/2 bg-white text-black" placeholder="Min" />
                                                <input type="text" value={xAxisMaxStr} onChange={e => setXAxisMaxStr(e.target.value)} className="border p-1 rounded w-1/2 bg-white text-black" placeholder="Max" />
                                                <button onClick={() => { setXAxisMinStr(''); setXAxisMaxStr(''); }} className="bg-gray-200 px-2 py-1 rounded text-sm text-black">Reset</button>
                                            </div>
                                            <label className="text-on-panel-secondary">Y-Axis Min/Max:</label>
                                            <div className="flex space-x-2">
                                                <input type="number" value={yAxisMin ?? ''} onChange={e => setYAxisMin(e.target.value === '' ? undefined : parseFloat(e.target.value))} className="border p-1 rounded w-1/2 bg-white text-black" placeholder="Min" />
                                                <input type="number" value={yAxisMax ?? ''} onChange={e => setYAxisMax(e.target.value === '' ? undefined : parseFloat(e.target.value))} className="border p-1 rounded w-1/2 bg-white text-black" placeholder="Max" />
                                                <button onClick={() => { setYAxisMin(undefined); setYAxisMax(undefined); }} className="bg-gray-200 px-2 py-1 rounded text-sm text-black">Reset</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* AI Assistant Section - pushed to the bottom */}
                            <div className="mt-auto pt-4 flex-shrink-0">
                                <ChatPanel
                                    onSendMessage={handleSendMessage}
                                    messages={chatMessages}
                                    isProcessing={isChatProcessing}
                                    apiService={apiService}
                                    setApiService={setApiService}
                                    selectedModel={selectedModel}
                                    setSelectedModel={setSelectedModel}
                                />
                            </div>
                        </div>
                    )}
                    
                </div>
                {/* Collapse Button for Right Panel */}
                {isDataLoaded && (
                    <div className={`absolute top-1/2 -translate-y-1/2 z-40 transition-all duration-300 ease-in-out`} style={{ right: isRightPanelOpen ? '335px' : '25px' }}>
                        <button
                            className="bg-panel-bg p-2 rounded-full shadow-lg focus:outline-none ring-2 ring-white/50"
                            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                        >
                            <svg className={`w-5 h-5 text-on-panel-primary transition-transform duration-300 ${isRightPanelOpen ? 'rotate-180' : ''}`}
                                 fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default App;