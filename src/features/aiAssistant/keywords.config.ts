// Comprehensive keyword mapping and intent configuration for AI Assistant
// This file contains all the keywords, phrases, and intent mappings for the chart styling system

export interface KeywordPattern {
  patterns: string[];
  aliases: string[];
  description: string;
  intentType: string;
  requiredEntities: string[];
  optionalEntities: string[];
  examples: string[];
}

export interface ColorDefinition {
  name: string;
  hex: string;
  aliases: string[];
  opacity?: number;
}

export interface ShapeDefinition {
  name: string;
  aliases: string[];
  description: string;
}

// === COLOR DEFINITIONS ===
export const SUPPORTED_COLORS: ColorDefinition[] = [
  // Basic colors
  { name: 'red', hex: '#FF0000', aliases: ['crimson', 'scarlet', 'cherry'] },
  { name: 'blue', hex: '#0000FF', aliases: ['navy', 'azure', 'cobalt', 'sapphire'] },
  { name: 'green', hex: '#00FF00', aliases: ['lime', 'emerald', 'forest', 'mint'] },
  { name: 'yellow', hex: '#FFFF00', aliases: ['gold', 'amber', 'lemon', 'canary'] },
  { name: 'orange', hex: '#FFA500', aliases: ['tangerine', 'peach', 'apricot'] },
  { name: 'purple', hex: '#800080', aliases: ['violet', 'lavender', 'plum', 'magenta'] },
  { name: 'pink', hex: '#FFC0CB', aliases: ['rose', 'fuchsia', 'coral'] },
  { name: 'black', hex: '#000000', aliases: ['dark', 'charcoal', 'midnight'] },
  { name: 'white', hex: '#FFFFFF', aliases: ['snow', 'ivory', 'cream'] },
  { name: 'gray', hex: '#808080', aliases: ['grey', 'silver', 'ash'] },
  
  // Light variants
  { name: 'light red', hex: '#FFB6C1', aliases: ['light crimson', 'pale red', 'soft red'], opacity: 0.6 },
  { name: 'light blue', hex: '#ADD8E6', aliases: ['pale blue', 'sky blue', 'baby blue'], opacity: 0.6 },
  { name: 'light green', hex: '#90EE90', aliases: ['pale green', 'mint green'], opacity: 0.6 },
  { name: 'light yellow', hex: '#FFFFE0', aliases: ['pale yellow', 'cream yellow'], opacity: 0.6 },
  { name: 'light orange', hex: '#FFEFD5', aliases: ['pale orange', 'peach'], opacity: 0.6 },
  { name: 'light purple', hex: '#DDA0DD', aliases: ['light violet', 'pale lavender'], opacity: 0.6 },
  { name: 'light pink', hex: '#FFB6C1', aliases: ['pale pink', 'blush'], opacity: 0.6 },
  { name: 'light gray', hex: '#D3D3D3', aliases: ['light grey', 'pale gray'], opacity: 0.6 },
  
  // Very light variants
  { name: 'very light red', hex: '#FFDDDD', aliases: ['very pale red'], opacity: 0.3 },
  { name: 'very light blue', hex: '#E6F3FF', aliases: ['very pale blue'], opacity: 0.3 },
  { name: 'very light green', hex: '#E6FFE6', aliases: ['very pale green'], opacity: 0.3 },
  { name: 'very light yellow', hex: '#FFFFCC', aliases: ['very pale yellow'], opacity: 0.3 },
  { name: 'very light orange', hex: '#FFF4E6', aliases: ['very pale orange'], opacity: 0.3 },
  { name: 'very light purple', hex: '#F0E6FF', aliases: ['very pale purple'], opacity: 0.3 },
  
  // Special colors
  { name: 'cyan', hex: '#00FFFF', aliases: ['aqua', 'turquoise', 'teal'] },
  { name: 'maroon', hex: '#800000', aliases: ['burgundy', 'wine'] },
  { name: 'olive', hex: '#808000', aliases: ['khaki'] },
  { name: 'lime', hex: '#00FF00', aliases: ['bright green'] },
  { name: 'aqua', hex: '#00FFFF', aliases: ['cyan'] },
  { name: 'teal', hex: '#008080', aliases: ['dark cyan'] },
  { name: 'navy', hex: '#000080', aliases: ['dark blue'] },
  { name: 'fuchsia', hex: '#FF00FF', aliases: ['bright pink'] },
  { name: 'brown', hex: '#A52A2A', aliases: ['chocolate', 'coffee', 'espresso'] },
  { name: 'tan', hex: '#D2B48C', aliases: ['beige', 'sand'] },
  
  // Transparency keywords
  { name: 'transparent', hex: 'transparent', aliases: ['clear', 'invisible', 'blank', 'none'] },
  { name: 'semi-transparent', hex: '#80808080', aliases: ['half transparent', 'translucent'], opacity: 0.5 }
];

// === SHAPE DEFINITIONS ===
export const SUPPORTED_SHAPES: ShapeDefinition[] = [
  { name: 'circle', aliases: ['round', 'dot', 'point'], description: 'Circular marker' },
  { name: 'cross', aliases: ['plus', '+', 'x', 'times'], description: 'Cross or plus shaped marker' },
  { name: 'diamond', aliases: ['rhombus', 'gem'], description: 'Diamond shaped marker' },
  { name: 'square', aliases: ['box', 'rectangle'], description: 'Square shaped marker' },
  { name: 'star', aliases: ['asterisk', '*'], description: 'Star shaped marker' },
  { name: 'triangle', aliases: ['arrow', 'caret'], description: 'Triangle shaped marker' },
  { name: 'wye', aliases: ['y', 'fork'], description: 'Y-shaped marker' }
];

// === CHART ELEMENT KEYWORDS ===
export const CHART_ELEMENTS: KeywordPattern[] = [
  {
    patterns: ['background', 'bg', 'chart background', 'graph background', 'plot background'],
    aliases: ['backdrop', 'canvas', 'chart area', 'plot area'],
    description: 'Chart background styling',
    intentType: 'STYLE_CHART_ELEMENT',
    requiredEntities: ['chart_element', 'styling_property', 'property_value'],
    optionalEntities: [],
    examples: [
      'change background to blue',
      'set background color red',
      'make background transparent',
      'change bg to light green with opacity 30%'
    ]
  },
  {
    patterns: ['data points', 'points', 'point', 'markers', 'marker', 'dots', 'data'],
    aliases: ['observations', 'measured points', 'raw data', 'samples'],
    description: 'Data point marker styling',
    intentType: 'STYLE_CHART_ELEMENT',
    requiredEntities: ['chart_element', 'styling_property', 'property_value'],
    optionalEntities: [],
    examples: [
      'change marker to cross',
      'set point color blue',
      'make markers bigger',
      'change point style to plus',
      'marker blue'
    ]
  },
  {
    patterns: ['fitted curve', 'curve', 'line', 'fit', 'fitted line', 'trend line'],
    aliases: ['regression line', 'model line', 'fitted data', 'smoothed curve'],
    description: 'Fitted curve line styling',
    intentType: 'STYLE_CHART_ELEMENT',
    requiredEntities: ['chart_element', 'styling_property', 'property_value'],
    optionalEntities: [],
    examples: [
      'change line to blue',
      'make curve thicker',
      'set fitted line red',
      'change curve to dashed'
    ]
  },
  {
    patterns: ['legend', 'legend box'],
    aliases: ['key', 'chart key', 'legend panel'],
    description: 'Legend styling and positioning',
    intentType: 'STYLE_CHART_ELEMENT',
    requiredEntities: ['chart_element', 'styling_property', 'property_value'],
    optionalEntities: [],
    examples: [
      'change legend color red',
      'change legend background blue',
      'change legend text to black',
      'move legend to right',
      'increase legend size'
    ]
  },
  {
    patterns: ['grid', 'gridlines', 'grid lines'],
    aliases: ['chart grid', 'reference lines'],
    description: 'Grid line styling',
    intentType: 'STYLE_CHART_ELEMENT',
    requiredEntities: ['chart_element', 'styling_property', 'property_value'],
    optionalEntities: [],
    examples: [
      'show grid',
      'hide grid',
      'change grid to blue',
      'change grid to dashed'
    ]
  },
  {
    patterns: ['x-axis', 'x axis', 'horizontal axis'],
    aliases: ['x label', 'horizontal label'],
    description: 'X-axis styling and labels',
    intentType: 'STYLE_CHART_ELEMENT',
    requiredEntities: ['chart_element', 'styling_property', 'property_value'],
    optionalEntities: [],
    examples: [
      'change x-axis color',
      'increase x-axis size',
      'change x-axis label'
    ]
  },
  {
    patterns: ['y-axis', 'y axis', 'vertical axis'],
    aliases: ['y label', 'vertical label'],
    description: 'Y-axis styling and labels',
    intentType: 'STYLE_CHART_ELEMENT',
    requiredEntities: ['chart_element', 'styling_property', 'property_value'],
    optionalEntities: [],
    examples: [
      'change y-axis color',
      'increase y-axis size',
      'change y-axis label'
    ]
  }
];

// === MODEL CONFIGURATION KEYWORDS ===
export const MODEL_KEYWORDS: KeywordPattern[] = [
  {
    patterns: ['double logistic', 'double sigmoid', 'bi-logistic'],
    aliases: ['dual logistic', 'two-phase logistic'],
    description: 'Double logistic curve model',
    intentType: 'SET_CURVE_MODEL',
    requiredEntities: ['model_name'],
    optionalEntities: [],
    examples: [
      'use double logistic',
      'switch to double logistic model',
      'set model to double logistic'
    ]
  },
  {
    patterns: ['single logistic', 'logistic', 'sigmoid'],
    aliases: ['simple logistic', 'single sigmoid'],
    description: 'Single logistic curve model',
    intentType: 'SET_CURVE_MODEL',
    requiredEntities: ['model_name'],
    optionalEntities: [],
    examples: [
      'use single logistic',
      'switch to logistic model',
      'set model to sigmoid'
    ]
  },
  {
    patterns: ['loess', 'lowess', 'local regression'],
    aliases: ['locally weighted regression', 'smooth curve'],
    description: 'LOESS smoothing model',
    intentType: 'SET_CURVE_MODEL',
    requiredEntities: ['model_name'],
    optionalEntities: [],
    examples: [
      'use loess',
      'switch to loess smoothing',
      'apply local regression'
    ]
  },
  {
    patterns: ['moving average', 'rolling average', 'sliding window'],
    aliases: ['running average', 'windowed average'],
    description: 'Moving average smoothing',
    intentType: 'SET_CURVE_MODEL',
    requiredEntities: ['model_name'],
    optionalEntities: [],
    examples: [
      'use moving average',
      'apply rolling average',
      'switch to sliding window'
    ]
  },
  {
    patterns: ['savitzky-golay', 'savitzky golay', 'sg filter'],
    aliases: ['savgol', 'polynomial smoothing'],
    description: 'Savitzky-Golay filter',
    intentType: 'SET_CURVE_MODEL',
    requiredEntities: ['model_name'],
    optionalEntities: [],
    examples: [
      'use savitzky-golay',
      'apply sg filter',
      'switch to polynomial smoothing'
    ]
  }
];

// === PHENOPHASE TOGGLE KEYWORDS ===
export const PHENOPHASE_KEYWORDS: KeywordPattern[] = [
  {
    patterns: ['toggle sos', 'toggle start of season', 'enable sos', 'disable sos', 'show sos', 'hide sos'],
    aliases: ['sos button', 'start season button'],
    description: 'Toggle SOS phenophase visibility',
    intentType: 'TOGGLE_PHENOPHASE',
    requiredEntities: ['phenophase_type'],
    optionalEntities: ['action_verb'],
    examples: [
      'toggle sos',
      'disable sos',
      'show start of season',
      'hide sos points'
    ]
  },
  {
    patterns: ['toggle eos', 'toggle end of season', 'enable eos', 'disable eos', 'show eos', 'hide eos'],
    aliases: ['eos button', 'end season button'],
    description: 'Toggle EOS phenophase visibility',
    intentType: 'TOGGLE_PHENOPHASE',
    requiredEntities: ['phenophase_type'],
    optionalEntities: ['action_verb'],
    examples: [
      'toggle eos',
      'enable eos',
      'show end of season',
      'hide eos points'
    ]
  },
  {
    patterns: ['toggle peak', 'enable peak', 'disable peak', 'show peak', 'hide peak'],
    aliases: ['peak button', 'maximum button'],
    description: 'Toggle peak phenophase visibility',
    intentType: 'TOGGLE_PHENOPHASE',
    requiredEntities: ['phenophase_type'],
    optionalEntities: ['action_verb'],
    examples: [
      'toggle peak',
      'disable peak',
      'show peak values',
      'hide peak points'
    ]
  },
  {
    patterns: ['toggle phenophases', 'toggle all phases', 'enable phenophases', 'disable phenophases'],
    aliases: ['toggle phases', 'phenophase buttons'],
    description: 'Toggle all phenophases',
    intentType: 'TOGGLE_PHENOPHASE',
    requiredEntities: ['phenophase_type'],
    optionalEntities: ['action_verb'],
    examples: [
      'toggle phenophases',
      'disable all phases',
      'show all phenophases'
    ]
  }
];

// === OPTIMIZATION KEYWORDS ===
export const OPTIMIZATION_KEYWORDS: KeywordPattern[] = [
  {
    patterns: ['optimize', 'optimize fit', 'optimize curve', 'fit curve', 'fit line', 'correct fit'],
    aliases: ['improve fit', 'auto-fit', 'best fit', 'curve fitting'],
    description: 'Optimize curve fitting parameters',
    intentType: 'EXECUTE_ACTION',
    requiredEntities: ['action_verb'],
    optionalEntities: [],
    examples: [
      'optimize the fit',
      'fit the curve',
      'correct the fit curve',
      'optimize fit parameters',
      'find best fit'
    ]
  }
];

// === DATA LOADING KEYWORDS ===
export const DATA_LOADING_KEYWORDS: KeywordPattern[] = [
  {
    patterns: ['load data', 'open file', 'import data', 'use other file', 'open document'],
    aliases: ['browse file', 'select file', 'choose file'],
    description: 'Load new data file',
    intentType: 'LOAD_DATA',
    requiredEntities: ['action_verb'],
    optionalEntities: [],
    examples: [
      'load data',
      'open other file',
      'import new data',
      'use different document'
    ]
  },
  {
    patterns: ['load grouping', 'add grouping', 'add separation', 'add background strips', 'add background labels'],
    aliases: ['import grouping', 'load phases', 'add phases'],
    description: 'Load grouping/phenophase data',
    intentType: 'LOAD_GROUPING',
    requiredEntities: ['action_verb'],
    optionalEntities: [],
    examples: [
      'load grouping data',
      'add background strips',
      'import phenophases',
      'add separation data'
    ]
  }
];

// === AXIS CONFIGURATION KEYWORDS ===
export const AXIS_KEYWORDS: KeywordPattern[] = [
  {
    patterns: ['change x column', 'set x column', 'x column', 'set date', 'add date', 'set das', 'add das', 'set doy', 'add doy'],
    aliases: ['x-axis data', 'horizontal axis data', 'time column'],
    description: 'Configure X-axis column',
    intentType: 'SET_AXIS_COLUMN',
    requiredEntities: ['axis_name', 'column_name'],
    optionalEntities: [],
    examples: [
      'change x column to date',
      'set x-axis to DAS',
      'add DoY to graph',
      'use date for x-axis'
    ]
  },
  {
    patterns: ['change y column', 'set y column', 'y column', 'add ndvi', 'add gcc', 'add rcc'],
    aliases: ['y-axis data', 'vertical axis data', 'index column'],
    description: 'Configure Y-axis column',
    intentType: 'SET_AXIS_COLUMN',
    requiredEntities: ['axis_name', 'column_name'],
    optionalEntities: [],
    examples: [
      'change y column to NDVI',
      'add GCC to graph',
      'set y-axis to RCC',
      'use NDVI for y-axis'
    ]
  },
  {
    patterns: ['axis limit', 'set x to', 'set y to', 'x range', 'y range', 'axis range'],
    aliases: ['limit axis', 'axis bounds', 'scale limits'],
    description: 'Set axis limits and ranges',
    intentType: 'SET_AXIS_LIMITS',
    requiredEntities: ['axis_name'],
    optionalEntities: ['min_value', 'max_value'],
    examples: [
      'change x to 0 to 150',
      'set y from 0 to 1',
      'x axis start with 25',
      'dont show values after 150 on x'
    ]
  }
];

// === OUTLIER MANAGEMENT KEYWORDS ===
export const OUTLIER_KEYWORDS: KeywordPattern[] = [
  {
    patterns: ['delete outliers', 'remove outliers', 'enable outlier removal', 'outlier detection'],
    aliases: ['filter outliers', 'exclude outliers', 'clean data'],
    description: 'Enable outlier removal',
    intentType: 'MANAGE_OUTLIERS',
    requiredEntities: ['action_verb'],
    optionalEntities: ['outlier_method', 'threshold_value'],
    examples: [
      'remove outliers',
      'delete bad points',
      'enable outlier removal',
      'filter outliers with SD method'
    ]
  },
  {
    patterns: ['remove 0 values', 'remove nan values', 'remove blank values', 'remove useless values', 'delete 0 values'],
    aliases: ['filter zeros', 'remove nulls', 'clean zeros'],
    description: 'Remove specific value types',
    intentType: 'FILTER_VALUES',
    requiredEntities: ['action_verb', 'value_type'],
    optionalEntities: [],
    examples: [
      'remove 0 values',
      'delete NaN values',
      'remove blank entries',
      'filter out zeros'
    ]
  }
];

// === PARAMETER ADJUSTMENT KEYWORDS ===
export const PARAMETER_KEYWORDS: KeywordPattern[] = [
  {
    patterns: ['set baseline', 'change baseline', 'baseline to', 'baseline at'],
    aliases: ['adjust baseline', 'modify baseline'],
    description: 'Set baseline parameter',
    intentType: 'ADJUST_MODEL_PARAMETER',
    requiredEntities: ['parameter_name', 'parameter_value'],
    optionalEntities: ['lock_parameter'],
    examples: [
      'set baseline at 0.3',
      'change baseline to 0.2',
      'baseline at 0.4 and lock it'
    ]
  },
  {
    patterns: ['change sos', 'set sos', 'sos to', 'start to'],
    aliases: ['adjust sos', 'modify start'],
    description: 'Set SOS parameter',
    intentType: 'ADJUST_MODEL_PARAMETER',
    requiredEntities: ['parameter_name', 'parameter_value'],
    optionalEntities: ['lock_parameter'],
    examples: [
      'change sos to 30',
      'set start at 25',
      'sos to 35 and fit line'
    ]
  },
  {
    patterns: ['lock parameter', 'unlock parameter', 'lock', 'unlock'],
    aliases: ['fix parameter', 'release parameter'],
    description: 'Lock/unlock parameters',
    intentType: 'LOCK_PARAMETER',
    requiredEntities: ['action_verb'],
    optionalEntities: ['parameter_name'],
    examples: [
      'lock baseline',
      'unlock sos parameter',
      'lock it and optimize'
    ]
  }
];

// === QUERY AND RESULTS KEYWORDS ===
export const QUERY_KEYWORDS: KeywordPattern[] = [
  {
    patterns: ['give me sos value', 'show sos', 'what is sos', 'sos value'],
    aliases: ['sos result', 'start of season value'],
    description: 'Query SOS values',
    intentType: 'QUERY_DATA',
    requiredEntities: ['pheno_metric'],
    optionalEntities: [],
    examples: [
      'give me sos value',
      'what is the sos?',
      'show start of season',
      'sos results'
    ]
  },
  {
    patterns: ['what is r square', 'what is r2', 'show r2', 'r2 value', 'goodness of fit'],
    aliases: ['coefficient of determination', 'r squared'],
    description: 'Query R² values',
    intentType: 'QUERY_DATA',
    requiredEntities: ['pheno_metric'],
    optionalEntities: [],
    examples: [
      'what is r2?',
      'show r square',
      'goodness of fit',
      'fit quality'
    ]
  },
  {
    patterns: ['what is rmse', 'show rmse', 'rmse value', 'fit error'],
    aliases: ['root mean square error', 'fitting error'],
    description: 'Query RMSE values',
    intentType: 'QUERY_DATA',
    requiredEntities: ['pheno_metric'],
    optionalEntities: [],
    examples: [
      'what is rmse?',
      'show fitting error',
      'rmse value',
      'error metrics'
    ]
  }
];

// === DOWNLOAD/EXPORT KEYWORDS ===
export const DOWNLOAD_KEYWORDS: KeywordPattern[] = [
  {
    patterns: ['download', 'download result', 'download image', 'save graph', 'export'],
    aliases: ['save results', 'export data', 'save chart'],
    description: 'Download results and charts',
    intentType: 'EXECUTE_ACTION',
    requiredEntities: ['action_verb'],
    optionalEntities: [],
    examples: [
      'download results',
      'save the graph',
      'export chart',
      'download image'
    ]
  }
];

// === LEGEND MANAGEMENT KEYWORDS ===
export const LEGEND_KEYWORDS: KeywordPattern[] = [
  {
    patterns: ['show legend', 'hide legend', 'toggle legend', 'enable legend', 'disable legend'],
    aliases: ['legend visibility', 'chart legend'],
    description: 'Control legend visibility',
    intentType: 'MANAGE_VIEW',
    requiredEntities: ['action_verb', 'chart_element'],
    optionalEntities: [],
    examples: [
      'show legend',
      'hide legend',
      'toggle legend visibility',
      'disable legend'
    ]
  },
  {
    patterns: ['move legend', 'legend position', 'move legend to right', 'move legend up'],
    aliases: ['position legend', 'relocate legend'],
    description: 'Change legend position',
    intentType: 'MOVE_LEGEND',
    requiredEntities: ['chart_element', 'position'],
    optionalEntities: [],
    examples: [
      'move legend to right',
      'move legend up',
      'position legend left',
      'legend to bottom'
    ]
  }
];

// === COMBINED PATTERN RECOGNITION ===
export const COMBINED_PATTERNS = {
  // Multiple styling properties in one command
  COLOR_WITH_OPACITY: /\b(change|set)\s+(background|marker|legend)\s+to\s+([\w\s]+)\s+with\s+opacity\s+(\d+)%/,
  STYLE_AND_OPTIMIZE: /\b(set|change)\s+(\w+)\s+to\s+([\d.]+)\s*,?\s*(and\s+)?(lock\s+it\s+)?(and\s+)?(fit|optimize)/,
  AXIS_RANGE: /\b(change|set)\s+(x|y)\s+to\s+(\d+)\s+to\s+(\d+)/,
  POSITION_COMMAND: /\b(move|position)\s+(legend)\s+(to\s+)?(left|right|up|down|top|bottom)/
};

export default {
  SUPPORTED_COLORS,
  SUPPORTED_SHAPES,
  CHART_ELEMENTS,
  MODEL_KEYWORDS,
  PHENOPHASE_KEYWORDS,
  OPTIMIZATION_KEYWORDS,
  DATA_LOADING_KEYWORDS,
  AXIS_KEYWORDS,
  OUTLIER_KEYWORDS,
  PARAMETER_KEYWORDS,
  QUERY_KEYWORDS,
  DOWNLOAD_KEYWORDS,
  LEGEND_KEYWORDS,
  COMBINED_PATTERNS
};
