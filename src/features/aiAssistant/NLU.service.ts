// Natural Language Understanding Service - Fixed Version
import { 
  NLUResult, 
  IntentType,
  Entity
} from './ai.types';

export class NLUService {
  private static instance: NLUService;
  
  private constructor() {}
  
  static getInstance(): NLUService {
    if (!NLUService.instance) {
      NLUService.instance = new NLUService();
    }
    return NLUService.instance;
  }

  // Main parsing function
  async parse(text: string, currentContext?: any): Promise<NLUResult> {
    const normalizedText = text.toLowerCase().trim();
    
    console.log('NLU: Parsing text:', text);
    console.log('NLU: Current context:', currentContext);
    
    // Intent classification
    const intentResult = this.classifyIntent(normalizedText);
    
    // Entity extraction with context awareness
    const entities = this.extractEntities(normalizedText, intentResult.intent, currentContext);

    // Map classic intents to action intents for ActionService compatibility
    const mappedIntent = this.mapIntentToActionIntent(intentResult.intent);

    const result = {
      intent: mappedIntent,
      confidence: intentResult.confidence,
      entities: entities
    };
    
    console.log('NLU: Final result:', result);
    return result;
  }

  // Map general intents to specific action intents that ActionService can handle
  private mapIntentToActionIntent(intent: IntentType): IntentType {
    const intentMap: Record<string, IntentType> = {
      'chart_styling': 'STYLE_CHART_ELEMENT',
      'model_configuration': 'SET_CURVE_MODEL',
      'data_analysis': 'QUERY_DATA',
      'parameter_adjustment': 'ADJUST_MODEL_PARAMETER',
      'question': 'question',
      'chitchat': 'chitchat',
      'unknown': 'unknown'
    };

    return intentMap[intent] || intent;
  }

  private classifyIntent(text: string): { intent: IntentType; confidence: number } {
    console.log('NLU: Classifying intent for:', text);
    
    // Check for chitchat patterns first
    const chitchatPatterns = [
      /\b(hello|hi|hey|good morning|good afternoon|good evening|greetings)\b/,
      /\b(how are you|how's it going|what's up|sup|how do you do)\b/,
      /\b(thank you|thanks|appreciate|good job|well done|great|awesome|cool)\b/,
      /\b(bye|goodbye|see you|farewell|later)\b/,
      /\b(you're|youre)\b.*\b(funny|cool|awesome|great|helpful|amazing)\b/,
      /\b(hi|hey|hello)\b.*\b(sexy|beautiful|gorgeous|cutie|babe|darling)\b/,
      /\b(sexy|beautiful|gorgeous|cutie|babe|darling)\b/
    ];

    for (const pattern of chitchatPatterns) {
      if (pattern.test(text)) {
        console.log('NLU: Matched chitchat pattern:', pattern.source);
        return { intent: 'chitchat', confidence: 0.9 };
      }
    }

    // Check for chart styling patterns - be VERY comprehensive
    const chartStylingPatterns = [
      // Grid patterns
      /\b(fuck|remove|hide|show|toggle|disable|enable)\b.*\b(grid|gridlines|grid lines|gridline)\b/,
      /\b(grid|gridlines|grid lines|gridline)\b/,
      
      // Legend patterns  
      /\b(change|set|modify)\b.*\b(legend)\b/,
      /\b(legend)\b.*\b(color|colour|background|to|red|blue|green|yellow|orange|purple|black|white|gray|grey)\b/,
      /\b(increase|decrease|change|set|modify)\b.*\b(legend)\b.*\b(size|font|text)\b/,
      /\b(legend)\b.*\b(size|font|text|bigger|smaller|larger)\b/,
      /\b(font size|text size|size)\b.*\b(legend)\b/,
      
      // Line/curve patterns
      /\b(change|set|modify)\b.*\b(line|curve|fitted)\b/,
      /\b(line|curve|fitted)\b.*\b(to|color|colour|red|blue|green|yellow|orange|purple|black|white|gray|grey)\b/,
      /\b(change|set|modify)\b.*\b(line|curve)\b.*\b(thickness|thick|width)\b/,
      /\b(line|curve)\b.*\b(thickness|thick|width)\b.*\b(to|\d+)\b/,
      /\b(line|curve|fitted)\b.*\b(thickness|thick|width)\b/,
      /\b(thickness|thick|width)\b.*\b(line|curve|fitted)\b/,
      
      // Background patterns (including typos and favorite color)
      /\b(change|set|modify)\b.*\b(background|bg|backgorund|backgroun)\b/,
      /\b(background|bg|backgorund|backgroun)\b.*\b(to|color|colour|red|blue|green|yellow|orange|purple|black|white|gray|grey)\b/,
      /\b(change|set|make)\b.*\b(background|bg)\b.*\b(to)\b.*\b(your|my|favourite|favorite)\b.*\b(color|colour)\b/,
      /\b(background|bg)\b.*\b(to)\b.*\b(your|my|favourite|favorite)\b.*\b(color|colour)\b/,
      
      // Marker patterns
      /\b(change|set|modify)\b.*\b(marker|point|points)\b/,
      /\b(marker|point|points)\b.*\b(to|cross|circle|square|triangle|diamond|star|red|blue|green|yellow|orange|purple|black|white)\b/,
      /\b(change|set|modify)\b.*\b(marker|point|points)\b.*\b(style|shape|color|colour|size)\b/,
      /\b(marker|point|points)\b.*\b(style|shape|color|colour|size)\b/,
      // More flexible pattern for "change marker style" type commands
      /\b(change|set|modify|please)\b.*\b(marker|point|points)\b.*\b(style|shape)\b/,
      
      // Basic styling patterns
      /\b(change|set|make|modify|update|alter)\b.*\b(color|colour|size|shape|thickness|style|opacity)\b/,
      /\b(color|colour)\b.*\b(red|blue|green|yellow|orange|purple|black|white|gray|grey)\b/,
      
      // Very broad patterns for styling actions
      /\b(change|set|make)\b.*\b(to)\b/, // "change X to Y" pattern
      /\b(hide|show|remove|fuck)\b/, // Action verbs
      /\b(red|blue|green|yellow|orange|purple|black|white|gray|grey)\b/, // Any color mention
      
      // Single-word styling responses (for follow-up conversations)
      /^\s*(shape|color|colour|size|style|opacity|thickness)\s*$/,
      /^\s*(circle|square|triangle|diamond|star|cross|x|plus)\s*$/,
      /^\s*(red|blue|green|yellow|orange|purple|black|white|gray|grey)\s*$/,
    ];

    // Test for chart styling first
    for (const pattern of chartStylingPatterns) {
      if (pattern.test(text)) {
        console.log('NLU: Matched chart styling pattern:', pattern.source);
        return { intent: 'chart_styling', confidence: 0.9 };
      }
    }

    // Check for other intent patterns
    const intentPatterns: Partial<Record<IntentType, RegExp[]>> = {
      'model_configuration': [
        /\b(use|switch to|set|select|choose)\b.*\b(double logistic|single logistic|loess|moving average|savitzky|golay)\b/,
        /\b(model|curve|fitting)\b.*\b(double|single|logistic|loess|moving|average|savitzky|golay)\b/,
        /\b(set|change|modify|update)\b.*\b(x-axis|y-axis|axis)\b/
      ],
      'data_analysis': [
        /\b(show|tell|display|give me|get|extract)\b.*\b(r2|r²|rmse|sos|eos|peak|value|result)\b/,
        /\b(show me|give me|display)\b.*\b(results|statistics|metrics|values)\b/,
        /\b(lock|unlock|optimize|remove|clear|reset|download)\b/,
        /\b(value of|extract.*value)\b.*\b(r2|r²|rmse|sos|eos|peak)\b/
      ],
      'parameter_adjustment': [
        /\b(set|change|adjust|modify|update)\b.*\b(baseline|amplitude|start|end|growth|senescence|span|window|size)\b/,
        /\b(parameter|param)\b.*\b(\d+|\d+\.\d+)\b/
      ],
      'question': [
        /\b(what is|what's|whats|define|explain|meaning of)\b.*\b(phenology|loess|logistic|savitzky|golay|ndvi|gcc|sos|eos|r2|r²|rmse|r square)\b/,
        /\b(what is|what's|whats)\b.*\b(sos|eos|r2|r²|rmse|peak|r square)\b/,
        /\b(explain|describe|tell me about)\b/,
        /\b(help|info|information)\b.*\b(about|on)\b/
      ]
    };

    let bestMatch: { intent: IntentType; confidence: number } = { intent: 'unknown', confidence: 0 };

    for (const [intentName, patterns] of Object.entries(intentPatterns)) {
      let maxConfidence = 0;
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          maxConfidence = Math.max(maxConfidence, 0.8);
          console.log('NLU: Matched pattern for', intentName, ':', pattern.source);
        }
      }
      
      if (maxConfidence > bestMatch.confidence) {
        bestMatch = { intent: intentName as IntentType, confidence: maxConfidence };
      }
    }

    // If no intent matches above threshold, return unknown
    if (bestMatch.confidence < 0.5) {
      bestMatch = { intent: 'unknown', confidence: 1.0 };
    }

    console.log('NLU: Best match:', bestMatch, 'for text:', text);
    return bestMatch;
  }

  private extractEntities(text: string, intent: IntentType, currentContext?: any): Entity[] {
    const entities: Entity[] = [];
    const normalizedText = text.toLowerCase().trim();

    console.log('NLU extractEntities called with:', { text, intent, normalizedText, currentContext });

    // Handle follow-up commands that reference previous context
    if (currentContext && currentContext.current_intent === 'STYLE_CHART_ELEMENT') {
      // Check for percentage/numeric adjustments like "make it 10%" or "set it to 50%"
      const percentageMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*%/);
      const numericMatch = normalizedText.match(/\b(\d+(?:\.\d+)?)\b/);
      
      if ((/\b(make|set|change)\b.*\b(it|that|this)\b/.test(normalizedText) || 
           /^\s*(\d+(?:\.\d+)?)\s*%?\s*$/.test(normalizedText)) &&
          (percentageMatch || numericMatch)) {
        
        console.log('NLU: Detected follow-up command with context');
        
        // Inherit chart_element from context
        const previousSlots = currentContext.unfilled_slots || [];
        const previousElement = previousSlots.find((s: any) => s.entity === 'chart_element' && s.value);
        
        if (previousElement) {
          entities.push({
            entity: 'chart_element',
            value: previousElement.value,
            confidence: 0.9
          });
          console.log('NLU: Inherited chart_element from context:', previousElement.value);
        }
        
        // Determine styling property and value
        if (percentageMatch && previousElement?.value === 'background') {
          entities.push({
            entity: 'styling_property', 
            value: 'opacity',
            confidence: 0.9
          });
          
          const percentage = parseFloat(percentageMatch[1]);
          entities.push({
            entity: 'property_value',
            value: (percentage / 100).toString(),
            confidence: 0.9
          });
          
          console.log('NLU: Inferred opacity adjustment for background:', percentage / 100);
          
          // Return early since we've handled this follow-up command
          return entities;
        }
      }
    }

    // Continue with normal entity extraction if not a follow-up command
    if (intent === 'chart_styling') {
      // Extract chart element (what part of the chart) - be very liberal in detection
      let chartElement = null;
      let stylingProperty = null;
      let propertyValue = null;
      
      console.log('NLU: Checking chart element patterns for:', normalizedText);
      
      // Check for grid first (highest priority for grid commands)
      if (/\b(grid|gridlines|grid lines|gridline)\b/.test(normalizedText)) {
        chartElement = 'grid';
        console.log('NLU: Matched grid element');
      }
      // Check for background - including typos
      else if (/\b(background|bg|backgorund|backgroun)\b/.test(normalizedText)) {
        chartElement = 'background';
        console.log('NLU: Matched background element');
        
        // Combo rule: if a color is also mentioned, set the styling property
        if (/\b(color|colour|red|blue|green|yellow|orange|purple|black|white|gray|grey)\b/.test(normalizedText)) {
          stylingProperty = 'color';
          console.log('NLU: Matched color property in background combo');
        }
      } 
      // Check for legend
      else if (/\b(legend)\b/.test(normalizedText)) {
        chartElement = 'legend';
      }
      // Check for curve/line - including fitted variations
      else if (/\b(curve|line|fitted curve|fitted line|trend line|fit line)\b/.test(normalizedText)) {
        chartElement = 'fitted curve';
      }
      // Check for points/markers - handle all variations
      else if (/\b(data points|points?|markers?|marker|dots|point)\b/.test(normalizedText)) {
        chartElement = 'data points';
      }
      // Check for axes
      else if (/\b(x-axis|x axis)\b/.test(normalizedText)) {
        chartElement = 'x-axis';
      }
      else if (/\b(y-axis|y axis)\b/.test(normalizedText)) {
        chartElement = 'y-axis';
      }
      // If we can't identify a specific element but we have styling words, default based on context
      else if (/\b(color|colour|red|blue|green|yellow|orange|purple|black|white|gray|grey)\b/.test(normalizedText)) {
        // This is a fallback - if user mentions a color but no clear element, assume background
        chartElement = 'background';
      }

      if (chartElement) {
        entities.push({ 
          entity: 'chart_element', 
          value: chartElement, 
          confidence: 0.9 
        });
        console.log('Found chart element:', chartElement);
      }

      // Extract styling properties and values
      // Note: stylingProperty may have been set above in a combo rule

      // For grid operations, check for visibility actions first
      if (chartElement === 'grid') {
        if (/\b(hide|remove|fuck|disable|off)\b/.test(normalizedText)) {
          stylingProperty = 'visibility';
          propertyValue = 'false';
        } else if (/\b(show|enable|on|display)\b/.test(normalizedText)) {
          stylingProperty = 'visibility';
          propertyValue = 'true';
        } else if (/\b(toggle)\b/.test(normalizedText)) {
          stylingProperty = 'visibility';
          propertyValue = 'toggle';
        }
      }

      // Check for colors
      if (!stylingProperty) {
        const colorRegex = /\b(red|blue|green|yellow|orange|purple|black|white|gray|grey)\b/;
        const colorMatch = normalizedText.match(colorRegex);
        
        if (/\b(color|colour)\b/.test(normalizedText) || colorMatch) {
          // For legend, distinguish between text color and background color
          if (chartElement === 'legend') {
            const isTextColor = /\b(text|font|word|letter)\b/.test(normalizedText);
            stylingProperty = isTextColor ? 'textColor' : 'backgroundColor';
          } else {
            stylingProperty = 'color';
          }
          
          if (colorMatch) {
            propertyValue = colorMatch[0];
          } else if (/\b(your|my|favourite|favorite)\b.*\b(color|colour)\b/.test(normalizedText)) {
            // When user says "favourite color", default to red 
            propertyValue = 'red';
          }
        }
      }

      // If propertyValue was not set, check again for any color name if stylingProperty is 'color'
      if (stylingProperty === 'color' && !propertyValue) {
        const colorRegex = /\b(red|blue|green|yellow|orange|purple|black|white|gray|grey)\b/;
        const colorMatch = normalizedText.match(colorRegex);
        if (colorMatch) {
          propertyValue = colorMatch[0];
          console.log('NLU: Found property value for color:', propertyValue);
        }
      }

      // Check for thickness (for lines/curves) - check this BEFORE fontSize to avoid conflicts
      if (!stylingProperty) {
        const thicknessRegex = /\b(\d+(?:\.\d+)?)\b/;
        const thicknessMatch = normalizedText.match(thicknessRegex);
        
        // Check if this is about line/curve thickness (explicit keywords or context)
        if (/\b(thickness|thick|width|stroke)\b/.test(normalizedText) ||
            (chartElement && /\b(line|curve|fitted)\b/.test(chartElement) && /\b(increase|decrease|bigger|smaller|thicker|thinner)\b/.test(normalizedText))) {
          stylingProperty = 'thickness';
          
          if (thicknessMatch) {
            propertyValue = thicknessMatch[0];
          } else if (/\b(increase|bigger|thicker)\b/.test(normalizedText)) {
            propertyValue = 'increase';
          } else if (/\b(decrease|smaller|thinner)\b/.test(normalizedText)) {
            propertyValue = 'decrease';
          }
        }
      }

      // Check for font size/size operations (only for text elements like legend)
      if (!stylingProperty) {
        const sizeRegex = /\b(\d+(?:\.\d+)?)\b/;
        const sizeMatch = normalizedText.match(sizeRegex);
        
        // Only apply fontSize for legend/text contexts, and NOT when dealing with line elements
        if ((chartElement === 'legend' || /\b(font|text)\b/.test(normalizedText)) &&
            !/\b(line|curve|fitted)\b/.test(chartElement || '') &&
            (/\b(font|text|bigger|smaller|larger|increase|decrease)\b/.test(normalizedText) ||
             (chartElement === 'legend' && /\b(size)\b/.test(normalizedText)))) {
          stylingProperty = 'fontSize';
          
          if (sizeMatch) {
            propertyValue = sizeMatch[0];
          } else if (/\b(increase|bigger|larger)\b/.test(normalizedText)) {
            propertyValue = 'increase';
          } else if (/\b(decrease|smaller)\b/.test(normalizedText)) {
            propertyValue = 'decrease';
          }
        }
      }

      // Check for shapes (for markers)
      if (!stylingProperty) {
        const shapeRegex = /\b(circle|square|triangle|diamond|star|cross|x|plus|\+)\b/;
        const shapeMatch = normalizedText.match(shapeRegex);
        
        // Handle explicit shape values with keywords
        if (/\b(shape|marker|to)\b/.test(normalizedText) && shapeMatch) {
          stylingProperty = 'shape';
          // Map user terms to correct marker shapes:
          // "cross" -> 'x' (X-style marker)
          // "plus" or "+" -> 'cross' (+-style marker)
          // "x" -> 'x' (X-style marker)
          let mappedValue = shapeMatch[0];
          if (mappedValue === 'cross') {
            propertyValue = 'x'; // Cross means X-style
          } else if (mappedValue === '+' || mappedValue === 'plus') {
            propertyValue = 'cross'; // Plus means +-style 
          } else {
            propertyValue = mappedValue;
          }
        }
        // Handle single word "shape" as a styling property request
        else if (/^\s*shape\s*$/i.test(normalizedText)) {
          stylingProperty = 'shape';
          propertyValue = null; // Will ask for clarification
        }
        // Handle standalone shape values (for follow-up responses)
        else if (shapeMatch && /^\s*(circle|square|triangle|diamond|star|cross|x|plus|\+)\s*$/i.test(normalizedText)) {
          stylingProperty = 'shape';
          let mappedValue = shapeMatch[0];
          if (mappedValue === 'cross') {
            propertyValue = 'x'; // Cross means X-style
          } else if (mappedValue === '+' || mappedValue === 'plus') {
            propertyValue = 'cross'; // Plus means +-style 
          } else {
            propertyValue = mappedValue;
          }
        }
      }

      // Check for general styling property requests (when no specific property is mentioned)
      if (!stylingProperty) {
        // Handle single word styling property requests like "shape", "color", etc.
        if (/^\s*(shape)\s*$/i.test(normalizedText)) {
          stylingProperty = 'shape';
          propertyValue = null; // Will ask for clarification about the value
        }
        else if (/^\s*(color|colour)\s*$/i.test(normalizedText)) {
          stylingProperty = 'color';
          propertyValue = null; // Will ask for clarification about the value  
        }
        else if (/^\s*(size)\s*$/i.test(normalizedText)) {
          stylingProperty = 'size';
          propertyValue = null; // Will ask for clarification about the value
        }
      }

      // Check for opacity
      if (!stylingProperty) {
        const percentagePattern = /(\d+(?:\.\d+)?)\s*%/;
        const percentageMatch = normalizedText.match(percentagePattern);
        
        if (/\b(opacity|transparent)\b/.test(normalizedText) || percentageMatch) {
          stylingProperty = 'opacity';
          if (percentageMatch) {
            const percentage = parseFloat(percentageMatch[1]);
            propertyValue = (percentage / 100).toString();
          }
        }
      }

      // Extract explicit opacity value for background colors
      const opacityPattern = /(\d+(?:\.\d+)?)\s*%/;
      const opacityMatch = normalizedText.match(opacityPattern);
      if (opacityMatch && (chartElement === 'background' || /\b(background|bg)\b/.test(normalizedText))) {
        const percentage = parseFloat(opacityMatch[1]);
        entities.push({ 
          entity: 'opacity_value', 
          value: (percentage / 100).toString(), 
          confidence: 0.9 
        });
      }

      // IMPORTANT: Check for generic style requests that need clarification
      // If someone says "change marker style" but doesn't specify what aspect,
      // we should NOT extract "style" as styling_property - instead ask for clarification
      if (!stylingProperty) {
        // Check if this is a generic style request that needs clarification
        const hasGenericStyleRequest = /\b(style|styling)\b/.test(normalizedText) && 
                                      !/(color|colour|shape|size|thickness|opacity)/i.test(normalizedText);
        
        if (hasGenericStyleRequest && chartElement) {
          // Don't extract styling_property - this will trigger clarification
          console.log('Generic style request detected - will ask for clarification');
        }
      }

      if (stylingProperty) {
        entities.push({ 
          entity: 'styling_property', 
          value: stylingProperty, 
          confidence: 0.9 
        });
        console.log('Found styling property:', stylingProperty);
      }

      if (propertyValue) {
        entities.push({ 
          entity: 'property_value', 
          value: propertyValue, 
          confidence: 0.9 
        });
        console.log('Found property value:', propertyValue);
      }
    }
    
    return entities;
  }
}

export default NLUService.getInstance();
