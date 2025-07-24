export type Point = {
  x: number;
  y: number;
  originalX?: number | string;
};

export enum CurveModel {
  DOUBLE_LOGISTIC = 'Double Logistic',
  SINGLE_LOGISTIC = 'Single Logistic',
  LOESS = 'LOESS',
  MOVING_AVERAGE = 'Moving Average',
  SAVITZKY_GOLAY = 'Savitzky-Golay',
}

export enum OutlierMethod {
    SD = 'Standard Deviation',
    IQR = 'Interquartile Range',
    MOVING_WINDOW_SD = 'Moving Window SD',
}

export interface FitParameters {
  baseline: number;
  amplitude: number;
  start: number;
  end: number;
  growthRate: number;
  senescenceRate: number;
  // For single logistic
  L: number;
  k: number;
  x0: number;
  // For LOESS
  span: number;
  // For other smoothers
  windowSize: number;
}

export interface ParameterConfig {
  name: keyof FitParameters;
  label: string;
  min: number;
  max: number;
  step: number;
}

export interface KeyPoints {
  sos: Point | null;
  eos: Point | null;
  peak: Point | null;
}

export interface GroupingConfig {
  startCol: string;
  endCol: string | null;
  labelCol: string | null;
  colorCol: string | null;
}

export interface GroupingData {
  start: number;
  end: number | null;
  label: string;
  color: string;
}

export interface DraggablePosition {
    x: number;
    y: number;
}

export interface BackgroundStyle {
    color: string;
    opacity: number;
}

export interface LineStyle {
    color: string;
    strokeWidth: number;
    opacity: number;
    strokeDasharray: string; // '0' for solid, '5 5' for dashed etc.
}

export type MarkerShape = 'circle' | 'cross' | 'diamond' | 'square' | 'star' | 'triangle' | 'wye' | 'x';

export interface MarkerStyle {
    color: string;
    shape: MarkerShape;
    size: number;
    opacity: number;
}

export interface TextStyle {
    color: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
}

export interface LegendStyle {
    // Text styling
    color: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';

    // Item & Layout styling
    iconSize: number;
    layout: 'horizontal' | 'vertical';

    // Background styling
    backgroundColor: string;
    backgroundOpacity: number;
}

export interface GridStyle {
    visible: boolean;
    color: string;
    strokeDasharray: string;
}

export interface ChartStyles {
    observed: MarkerStyle;
    outliers: MarkerStyle;
    pendingOutliers: MarkerStyle;
    fitted: LineStyle;
    xAxis: TextStyle;
    yAxis: TextStyle;
    groupingText: TextStyle;
    groupingStyles: LineStyle[];
    showGroupingLabels: boolean;
    legend: LegendStyle;
    chartBackground: BackgroundStyle;
    grid: GridStyle;
}

export interface ChartElementPositions {
    legend: DraggablePosition;
    groupingLabels: DraggablePosition[];
}


export type StyleTarget = keyof ChartStyles | 'groupingStyles';


export interface StylePickerState {
    visible: boolean;
    top: number;
    left: number;
    target: StyleTarget | null;
    targetIndex?: number; // For groupings
    currentStyle: Partial<LineStyle & MarkerStyle & TextStyle & BackgroundStyle & { grid: GridStyle }>;
}

export interface ColorPickerState {
    visible: boolean;
    top: number;
    left: number;
    onColorSelect: (color: string) => void;
}

export enum ApiService {
    OPENROUTER = 'OpenRouter',
    GEMINI = 'Gemini',
}

export enum OpenRouterModel {
    MISTRAL_7B_INSTRUCT = 'mistralai/mistral-7b-instruct',
    MISTRAL_SMALL_3_2 = 'mistralai/mistral-small-3.2-24b-instruct-2506',
}

export enum GeminiModel {
    GEMINI_1_5_FLASH = 'gemini-1.5-flash',
    GEMINI_1_5_PRO = 'gemini-1.5-pro',
}

export type ModelConfig = {
    service: ApiService;
    modelName: string;
};
