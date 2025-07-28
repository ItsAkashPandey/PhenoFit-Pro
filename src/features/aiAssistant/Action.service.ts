// Action Execution Service - Bridge between AI and React App
import { ActionResult, IntentType, ActionType, Entity } from './ai.types';
import { ChartStyles, CurveModel, FitParameters, MarkerShape } from '../../../types';

// Define the interface for app state setters that will be injected
export interface AppStateSetters {
  // Chart styles
  setStyles: React.Dispatch<React.SetStateAction<ChartStyles>>;
  
  // Model and parameters
  setCurveModel: React.Dispatch<React.SetStateAction<CurveModel>>;
  setParameters: React.Dispatch<React.SetStateAction<FitParameters>>;
  setLockedParams: React.Dispatch<React.SetStateAction<Set<keyof FitParameters>>>;
  
  // View controls
  setShowLegend: React.Dispatch<React.SetStateAction<boolean>>;
  setShowKeyPoints: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Axis controls
  setXAxisLabel: React.Dispatch<React.SetStateAction<string>>;
  setYAxisLabel: React.Dispatch<React.SetStateAction<string>>;
  setXAxisMin: React.Dispatch<React.SetStateAction<number | undefined>>;
  setXAxisMax: React.Dispatch<React.SetStateAction<number | undefined>>;
  setYAxisMin: React.Dispatch<React.SetStateAction<number | undefined>>;
  setYAxisMax: React.Dispatch<React.SetStateAction<number | undefined>>;
  
  // Outlier management
  setIsOutlierRemovalEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Actions
  handleOptimize: () => Promise<void>;
  handleApplyOutliers: () => void;
  handleResetOutliers: () => void;
  handleDownload: () => Promise<void>;
}

// Current app state that can be read
export interface AppStateGetters {
  styles: ChartStyles;
  curveModel: CurveModel;
  parameters: FitParameters;
  lockedParams: Set<keyof FitParameters>;
  stats: { r2: number; rmse: number };
  keyPoints: any;
  showLegend: boolean;
  showKeyPoints: boolean;
  isDataLoaded: boolean;
  isOptimizing: boolean;
  pendingOutliersCount: number;
  confirmedOutliersCount: number;
}

export class ActionService {
  private static instance: ActionService;
  private appSetters: AppStateSetters | null = null;
  private appGetters: AppStateGetters | null = null;
  
  private constructor() {}
  
  static getInstance(): ActionService {
    if (!ActionService.instance) {
      ActionService.instance = new ActionService();
    }
    return ActionService.instance;
  }

  // Initialize with app state setters and getters
  initialize(setters: AppStateSetters, getters: AppStateGetters): void {
    this.appSetters = setters;
    this.appGetters = getters;
  }

  // Main action execution function
  async executeAction(intent: IntentType, entities: Entity[]): Promise<ActionResult> {
    if (!this.appSetters || !this.appGetters) {
      return {
        success: false,
        message: 'AI Assistant not properly initialized'
      };
    }

    try {
      switch (intent) {
        case 'STYLE_CHART_ELEMENT':
          return this.handleStyleChartElement(entities);
          
        case 'MODIFY_AXIS':
          return this.handleModifyAxis(entities);
          
        case 'SET_CURVE_MODEL':
          return this.handleSetCurveModel(entities);
          
        case 'ADJUST_MODEL_PARAMETER':
          return this.handleAdjustModelParameter(entities);
          
        case 'EXECUTE_ACTION':
          return await this.handleExecuteAction(entities);
          
        case 'MANAGE_VIEW':
          return this.handleManageView(entities);
          
        case 'QUERY_DATA':
          return this.handleQueryData(entities);
          
        default:
          return {
            success: false,
            message: `Action for intent ${intent} not implemented yet`
          };
      }
    } catch (error) {
      console.error('Action execution error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private handleStyleChartElement(entities: Entity[]): ActionResult {
    console.log('ActionService.handleStyleChartElement called with entities:', entities);
    
    const chartElement = entities.find(e => e.entity === 'chart_element')?.value;
    const stylingProperty = entities.find(e => e.entity === 'styling_property')?.value;
    const propertyValue = entities.find(e => e.entity === 'property_value')?.value;

    console.log('Extracted values:', { chartElement, stylingProperty, propertyValue });

    if (!chartElement || !stylingProperty || !propertyValue) {
      console.log('Missing required information for styling');
      return {
        success: false,
        message: 'Missing required information for styling'
      };
    }

    const setters = this.appSetters!;
    
    try {
      setters.setStyles((prevStyles: ChartStyles) => {
        const newStyles = { ...prevStyles };
        
        // Map chart elements to style properties
        switch (chartElement) {
          case 'data points':
          case 'points':
          case 'markers':
          case 'marker':
            return this.updateMarkerStyle(newStyles, 'observed', stylingProperty, propertyValue);
            
          case 'fitted curve':
          case 'curve':
          case 'line':
          case 'fit':
            return this.updateLineStyle(newStyles, 'fitted', stylingProperty, propertyValue);
            
          case 'outliers':
            return this.updateMarkerStyle(newStyles, 'outliers', stylingProperty, propertyValue);
            
          case 'background':
            if (stylingProperty === 'color') {
              newStyles.chartBackground.color = this.parseColor(propertyValue);
              
              // Check if opacity was explicitly mentioned in the original command
              const opacityEntity = entities.find(e => e.entity === 'opacity_value');
              if (opacityEntity) {
                // Use explicit opacity if provided
                newStyles.chartBackground.opacity = this.parseNumber(opacityEntity.value, 0, 1);
              } else {
                // Default to 30% opacity for background color changes
                newStyles.chartBackground.opacity = 0.3;
              }
              
              return newStyles;
            } else if (stylingProperty === 'opacity') {
              newStyles.chartBackground.opacity = this.parseNumber(propertyValue, 0, 1);
              return newStyles;
            }
            throw new Error(`Unsupported property "${stylingProperty}" for background`);
            
          case 'grid':
            return this.updateGridStyle(newStyles, stylingProperty, propertyValue);
            
          case 'legend':
            return this.updateLegendStyle(newStyles, stylingProperty, propertyValue);
            
          case 'x-axis':
          case 'x axis':
            return this.updateTextStyle(newStyles, 'xAxis', stylingProperty, propertyValue);
            
          case 'y-axis':
          case 'y axis':
            return this.updateTextStyle(newStyles, 'yAxis', stylingProperty, propertyValue);
            
          case 'key points':
          case 'keypoints':
            // Key points use the same styling as data points for now
            return this.updateMarkerStyle(newStyles, 'observed', stylingProperty, propertyValue);
            
          default:
            throw new Error(`Unknown chart element: ${chartElement}`);
        }
      });

      return {
        success: true,
        message: `Updated ${chartElement} ${stylingProperty} to ${propertyValue}. Looking great! ✨`
      };
      
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update style'
      };
    }
  }

  private updateMarkerStyle(styles: ChartStyles, target: 'observed' | 'outliers' | 'pendingOutliers', property: string, value: any): ChartStyles {
    const newStyles = { ...styles };
    const currentStyle = { ...newStyles[target] };
    
    switch (property) {
      case 'color':
        currentStyle.color = this.parseColor(value);
        break;
      case 'size':
        currentStyle.size = this.parseNumber(value, 1, 20);
        break;
      case 'shape':
        currentStyle.shape = this.parseMarkerShape(value);
        break;
      case 'opacity':
        currentStyle.opacity = this.parseNumber(value, 0, 1);
        break;
      default:
        throw new Error(`Unknown marker property: ${property}`);
    }
    
    newStyles[target] = currentStyle;
    return newStyles;
  }

  private updateLineStyle(styles: ChartStyles, target: 'fitted', property: string, value: any): ChartStyles {
    const newStyles = { ...styles };
    const currentStyle = { ...newStyles[target] };
    
    switch (property) {
      case 'color':
        currentStyle.color = this.parseColor(value);
        break;
      case 'thickness':
      case 'size':
        if (value === 'increase' || value === 'bigger' || value === 'thicker') {
          // Increase thickness by 1, max 10
          currentStyle.strokeWidth = Math.min(10, (currentStyle.strokeWidth || 2) + 1);
        } else if (value === 'decrease' || value === 'smaller' || value === 'thinner') {
          // Decrease thickness by 1, min 1
          currentStyle.strokeWidth = Math.max(1, (currentStyle.strokeWidth || 2) - 1);
        } else {
          currentStyle.strokeWidth = this.parseNumber(value, 1, 10);
        }
        break;
      case 'opacity':
        currentStyle.opacity = this.parseNumber(value, 0, 1);
        break;
      case 'style':
        currentStyle.strokeDasharray = this.parseLineStyle(value);
        break;
      default:
        throw new Error(`Unknown line property: ${property}`);
    }
    
    newStyles[target] = currentStyle;
    return newStyles;
  }

  private updateGridStyle(styles: ChartStyles, property: string, value: any): ChartStyles {
    const newStyles = { ...styles };
    const currentStyle = { ...newStyles.grid };
    
    switch (property) {
      case 'color':
        currentStyle.color = this.parseColor(value);
        break;
      case 'style':
        currentStyle.strokeDasharray = this.parseLineStyle(value);
        break;
      case 'thickness':
        // Handle thickness for grid lines
        const currentThickness = currentStyle.strokeWidth || 1;
        if (value === 'increase') {
          currentStyle.strokeWidth = Math.min(5, currentThickness + 0.5);
        } else if (value === 'decrease') {
          currentStyle.strokeWidth = Math.max(0.5, currentThickness - 0.5);
        } else {
          currentStyle.strokeWidth = parseFloat(value) || 1;
        }
        break;
      case 'visibility':
        if (value === 'toggle') {
          currentStyle.visible = !currentStyle.visible;
        } else {
          currentStyle.visible = value === 'true' || value === true;
        }
        break;
      default:
        throw new Error(`Unknown grid property: ${property}`);
    }
    
    newStyles.grid = currentStyle;
    return newStyles;
  }

  private updateLegendStyle(styles: ChartStyles, property: string, value: any): ChartStyles {
    const newStyles = { ...styles };
    const currentStyle = { ...newStyles.legend };
    
    switch (property) {
      case 'color':
      case 'textColor':
        currentStyle.color = this.parseColor(value);
        break;
      case 'backgroundColor':
        currentStyle.backgroundColor = this.parseColor(value);
        break;
      case 'backgroundOpacity':
        currentStyle.backgroundOpacity = this.parseNumber(value, 0, 1);
        break;
      case 'size':
      case 'fontSize':
        if (value === 'increase') {
          currentStyle.fontSize = Math.min(24, (currentStyle.fontSize || 12) + 2);
        } else if (value === 'decrease') {
          currentStyle.fontSize = Math.max(8, (currentStyle.fontSize || 12) - 2);
        } else {
          currentStyle.fontSize = this.parseNumber(value, 8, 24);
        }
        break;
      case 'iconSize':
        currentStyle.iconSize = this.parseNumber(value, 8, 32);
        break;
      default:
        throw new Error(`Unknown legend property: ${property}`);
    }
    
    newStyles.legend = currentStyle;
    return newStyles;
  }

  private updateTextStyle(styles: ChartStyles, target: 'xAxis' | 'yAxis', property: string, value: any): ChartStyles {
    const newStyles = { ...styles };
    const currentStyle = { ...newStyles[target] };
    
    switch (property) {
      case 'color':
        currentStyle.color = this.parseColor(value);
        break;
      case 'size':
        currentStyle.fontSize = this.parseNumber(value, 8, 24);
        break;
      default:
        throw new Error(`Unknown text property: ${property}`);
    }
    
    newStyles[target] = currentStyle;
    return newStyles;
  }

  private handleModifyAxis(entities: Entity[]): ActionResult {
    // Convert entities array to a map for easier lookup
    const entityMap: Record<string, any> = {};
    for (const entity of entities) {
      entityMap[entity.entity] = entity.value;
    }
    
    const axisName = entityMap.axis_name;
    const axisRange = entityMap.axis_range;
    
    if (!axisName) {
      return {
        success: false,
        message: 'Axis name not specified'
      };
    }

    const setters = this.appSetters!;
    
    if (axisRange && Array.isArray(axisRange) && axisRange.length === 2) {
      const [min, max] = axisRange;
      
      if (axisName === 'x') {
        setters.setXAxisMin(min);
        setters.setXAxisMax(max);
      } else if (axisName === 'y') {
        setters.setYAxisMin(min);
        setters.setYAxisMax(max);
      }
      
      return {
        success: true,
        message: `Set ${axisName}-axis range to ${min} - ${max}`
      };
    }
    
    return {
      success: false,
      message: 'Invalid axis range specified'
    };
  }

  private handleSetCurveModel(entities: Entity[]): ActionResult {
    // Convert entities array to a map for easier lookup
    const entityMap: Record<string, any> = {};
    for (const entity of entities) {
      entityMap[entity.entity] = entity.value;
    }
    
    const modelName = entityMap.model_name;
    
    if (!modelName) {
      return {
        success: false,
        message: 'Model name not specified'
      };
    }

    const setters = this.appSetters!;
    
    // Map model names to CurveModel enum
    const modelMap: Record<string, CurveModel> = {
      'Double Logistic': CurveModel.DOUBLE_LOGISTIC,
      'Single Logistic': CurveModel.SINGLE_LOGISTIC,
      'LOESS': CurveModel.LOESS,
      'Moving Average': CurveModel.MOVING_AVERAGE,
      'Savitzky-Golay': CurveModel.SAVITZKY_GOLAY
    };
    
    const curveModel = modelMap[modelName];
    if (!curveModel) {
      return {
        success: false,
        message: `Unknown model: ${modelName}`
      };
    }
    
    setters.setCurveModel(curveModel);
    
    return {
      success: true,
      message: `Switched to ${modelName} model`
    };
  }

  private handleAdjustModelParameter(entities: Entity[]): ActionResult {
    // Convert entities array to a map for easier lookup
    const entityMap: Record<string, any> = {};
    for (const entity of entities) {
      entityMap[entity.entity] = entity.value;
    }
    
    const parameterName = entityMap.parameter_name;
    const parameterValue = entityMap.parameter_value;
    
    if (!parameterName || parameterValue === undefined) {
      return {
        success: false,
        message: 'Parameter name or value not specified'
      };
    }

    const setters = this.appSetters!;
    const getters = this.appGetters!;
    
    // Check if parameter is locked
    if (getters.lockedParams.has(parameterName as keyof FitParameters)) {
      return {
        success: false,
        message: `Parameter '${parameterName}' is currently locked. Unlock it first or ask me to unlock it.`,
        requiresConfirmation: true
      };
    }
    
    setters.setParameters((prev: FitParameters) => ({
      ...prev,
      [parameterName]: parameterValue
    }));
    
    return {
      success: true,
      message: `Set ${parameterName} to ${parameterValue}`
    };
  }

  private async handleExecuteAction(entities: Entity[]): Promise<ActionResult> {
    // Convert entities array to a map for easier lookup
    const entityMap: Record<string, any> = {};
    for (const entity of entities) {
      entityMap[entity.entity] = entity.value;
    }
    
    const actionVerb = entityMap.action_verb;
    
    if (!actionVerb) {
      return {
        success: false,
        message: 'Action not specified'
      };
    }

    const setters = this.appSetters!;
    const getters = this.appGetters!;
    
    switch (actionVerb) {
      case 'optimize':
        if (!getters.isDataLoaded) {
          return {
            success: false,
            message: 'No data loaded for optimization'
          };
        }
        
        try {
          await setters.handleOptimize();
          return {
            success: true,
            message: 'Parameters optimized successfully'
          };
        } catch (error) {
          return {
            success: false,
            message: 'Optimization failed'
          };
        }
        
      case 'download':
        if (!getters.isDataLoaded) {
          return {
            success: false,
            message: 'No data available for download'
          };
        }
        
        try {
          await setters.handleDownload();
          return {
            success: true,
            message: 'Results downloaded successfully'
          };
        } catch (error) {
          return {
            success: false,
            message: 'Download failed'
          };
        }
        
      case 'remove':
        if (getters.pendingOutliersCount === 0) {
          return {
            success: false,
            message: 'No outliers detected to remove'
          };
        }
        
        setters.handleApplyOutliers();
        return {
          success: true,
          message: `Removed ${getters.pendingOutliersCount} outliers`
        };
        
      case 'reset':
        setters.handleResetOutliers();
        return {
          success: true,
          message: 'Reset all outlier removals'
        };
        
      case 'lock':
        // Lock parameters based on context or ask for clarification
        return {
          success: false,
          message: 'Please specify which parameter to lock'
        };
        
      case 'unlock':
        // Unlock parameters based on context or ask for clarification
        return {
          success: false,
          message: 'Please specify which parameter to unlock'
        };
        
      default:
        return {
          success: false,
          message: `Unknown action: ${actionVerb}`
        };
    }
  }

  private handleManageView(entities: Entity[]): ActionResult {
    // Convert entities array to a map for easier lookup
    const entityMap: Record<string, any> = {};
    for (const entity of entities) {
      entityMap[entity.entity] = entity.value;
    }
    
    const actionVerb = entityMap.action_verb;
    const chartElement = entityMap.chart_element;
    
    if (!actionVerb) {
      return {
        success: false,
        message: 'Action not specified'
      };
    }

    const setters = this.appSetters!;
    
    const isShow = ['show', 'display'].includes(actionVerb);
    const isHide = ['hide', 'close'].includes(actionVerb);
    const isToggle = actionVerb === 'toggle';
    
    switch (chartElement) {
      case 'legend':
        if (isShow) {
          setters.setShowLegend(true);
          return { success: true, message: 'Legend is now visible' };
        } else if (isHide) {
          setters.setShowLegend(false);
          return { success: true, message: 'Legend is now hidden' };
        } else if (isToggle) {
          setters.setShowLegend(prev => !prev);
          return { success: true, message: 'Toggled legend visibility' };
        }
        break;
        
      case 'key points':
      case 'points':
        if (isShow) {
          setters.setShowKeyPoints(true);
          return { success: true, message: 'Key points are now visible' };
        } else if (isHide) {
          setters.setShowKeyPoints(false);
          return { success: true, message: 'Key points are now hidden' };
        } else if (isToggle) {
          setters.setShowKeyPoints(prev => !prev);
          return { success: true, message: 'Toggled key points visibility' };
        }
        break;
        
      case 'panel':
      case 'sidebar':
        if (isShow) {
          setters.setIsRightPanelOpen(true);
          return { success: true, message: 'Right panel is now open' };
        } else if (isHide) {
          setters.setIsRightPanelOpen(false);
          return { success: true, message: 'Right panel is now closed' };
        } else if (isToggle) {
          setters.setIsRightPanelOpen(prev => !prev);
          return { success: true, message: 'Toggled right panel' };
        }
        break;
    }
    
    return {
      success: false,
      message: `Cannot ${actionVerb} ${chartElement || 'unknown element'}`
    };
  }

  private handleQueryData(entities: Entity[]): ActionResult {
    // Convert entities array to a map for easier lookup
    const entityMap: Record<string, any> = {};
    for (const entity of entities) {
      entityMap[entity.entity] = entity.value;
    }
    
    const phenoMetric = entityMap.pheno_metric;
    const getters = this.appGetters!;
    
    if (!getters.isDataLoaded) {
      return {
        success: false,
        message: 'No data loaded to query'
      };
    }
    
    // If no specific metric requested, return overview
    if (!phenoMetric) {
      const { r2, rmse } = getters.stats;
      return {
        success: true,
        message: `Current results: R² = ${r2.toFixed(4)}, RMSE = ${rmse.toFixed(4)}`,
        data: { r2, rmse, keyPoints: getters.keyPoints }
      };
    }
    
    switch (phenoMetric) {
      case 'R²':
      case 'r2':
        return {
          success: true,
          message: `R² value is ${getters.stats.r2.toFixed(4)}`,
          data: { r2: getters.stats.r2 }
        };
        
      case 'RMSE':
        return {
          success: true,
          message: `RMSE value is ${getters.stats.rmse.toFixed(4)}`,
          data: { rmse: getters.stats.rmse }
        };
        
      case 'SOS':
        if (getters.keyPoints.sos) {
          return {
            success: true,
            message: `Start of Season (SOS): X = ${getters.keyPoints.sos.x.toFixed(2)}, Y = ${getters.keyPoints.sos.y.toFixed(2)}`,
            data: { sos: getters.keyPoints.sos }
          };
        }
        return { success: false, message: 'SOS not available' };
        
      case 'EOS':
        if (getters.keyPoints.eos) {
          return {
            success: true,
            message: `End of Season (EOS): X = ${getters.keyPoints.eos.x.toFixed(2)}, Y = ${getters.keyPoints.eos.y.toFixed(2)}`,
            data: { eos: getters.keyPoints.eos }
          };
        }
        return { success: false, message: 'EOS not available' };
        
      case 'Peak':
        if (getters.keyPoints.peak) {
          return {
            success: true,
            message: `Peak: X = ${getters.keyPoints.peak.x.toFixed(2)}, Y = ${getters.keyPoints.peak.y.toFixed(2)}`,
            data: { peak: getters.keyPoints.peak }
          };
        }
        return { success: false, message: 'Peak not available' };
        
      default:
        return {
          success: false,
          message: `Unknown metric: ${phenoMetric}`
        };
    }
  }

  // Utility functions for parsing values
  private parseColor(value: string): string {
    const colorMap: Record<string, string> = {
      'red': '#FF0000',
      'blue': '#0000FF',
      'green': '#00FF00',
      'yellow': '#FFFF00',
      'orange': '#FFA500',
      'purple': '#800080',
      'black': '#000000',
      'white': '#FFFFFF',
      'gray': '#808080',
      'grey': '#808080',
      'transparent': 'transparent',
      'clear': 'transparent',
      'blank': 'transparent'
    };
    
    return colorMap[value.toLowerCase()] || value;
  }

  private parseNumber(value: any, min: number, max: number): number {
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
    return Math.max(min, Math.min(max, isNaN(num) ? min : num));
  }

  private parseMarkerShape(value: string): MarkerShape {
    const shapeMap: Record<string, MarkerShape> = {
      'circle': 'circle',
      'cross': 'cross',    // +-style marker
      'diamond': 'diamond',
      'square': 'square',
      'star': 'star',
      'triangle': 'triangle',
      'x': 'x',           // X-style marker
      'plus': 'cross',    // plus means +-style
      '+': 'cross'        // + means +-style
    };
    
    return shapeMap[value.toLowerCase()] || 'circle';
  }

  private parseLineStyle(value: string): string {
    const styleMap: Record<string, string> = {
      'solid': '0',
      'dashed': '5 5',
      'dotted': '2 2',
      'dash-dot': '5 2 2 2'
    };
    
    return styleMap[value.toLowerCase()] || '0';
  }
}

export default ActionService.getInstance();
