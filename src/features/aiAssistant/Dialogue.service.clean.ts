// Dialogue Management Service
import { 
  ConversationContext, 
  DialogueState, 
  AIMessage, 
  ActionResult,
  AppStateSnapshot,
  IntentType,
  Entity
} from './ai.types';

export class DialogueService {
  private static instance: DialogueService;
  private context: ConversationContext;
  private dialogueState: DialogueState;
  
  private constructor() {
    this.context = {
      current_intent: null,
      unfilled_slots: [],
      conversation_history: [],
      app_state_snapshot: this.createEmptySnapshot()
    };
    
    this.dialogueState = {
      currentIntent: undefined,
      pendingSlots: {},
      context: this.context,
      isWaitingForResponse: false
    };
  }
  
  static getInstance(): DialogueService {
    if (!DialogueService.instance) {
      DialogueService.instance = new DialogueService();
    }
    return DialogueService.instance;
  }

  // Add a message to conversation history
  addMessage(message: AIMessage): void {
    this.context.conversation_history.push(message);
    
    // Keep only last 20 messages to prevent memory bloat
    if (this.context.conversation_history.length > 20) {
      this.context.conversation_history = this.context.conversation_history.slice(-20);
    }
  }

  // Update the current intent and check for required slots
  setCurrentIntent(intent: IntentType, entities: any[]): { needsClarification: boolean; missingSlots: string[] } {
    this.context.current_intent = intent;
    this.dialogueState.currentIntent = intent;
    
    const requiredSlots = this.getRequiredSlotsForIntent(intent);
    const providedSlots = this.extractSlots(entities);
    
    // Fill all provided slots
    for (const [slotName, value] of Object.entries(providedSlots)) {
      this.fillSlot(slotName, value);
    }
    
    // Check which required slots are still missing
    const missingSlots = requiredSlots.filter(slot => 
      !this.context.unfilled_slots.some(s => s.entity === slot.entity && s.value)
    );
    
    // Add missing slots to unfilled_slots
    for (const slot of missingSlots) {
      if (!this.context.unfilled_slots.find(s => s.entity === slot.entity)) {
        this.context.unfilled_slots.push({
          entity: slot.entity,
          value: null,
          description: slot.description || `Please specify ${slot.entity}`
        });
      }
    }
    
    return {
      needsClarification: missingSlots.length > 0,
      missingSlots: missingSlots.map(slot => slot.entity)
    };
  }

  // Check if a slot can be filled (exists in unfilled_slots)
  private canFillSlot(slotName: string): boolean {
    return this.context.unfilled_slots.some(slot => slot.entity === slotName);
  }

  // Fill a slot if it exists in the unfilled slots
  fillSlot(slotName: string, value: any): boolean {
    const slotIndex = this.context.unfilled_slots.findIndex(slot => slot.entity === slotName);
    if (slotIndex !== -1) {
      this.context.unfilled_slots[slotIndex].value = value;
      return true;
    }
    return false;
  }

  // Check if we have slots that need clarification
  hasUnfilledSlots(): boolean {
    return this.context.unfilled_slots.some(slot => !slot.value);
  }

  // Get the first unfilled slot for prompting
  getNextUnfilledSlot(): { entity: string; description: string } | null {
    const unfilledSlot = this.context.unfilled_slots.find(slot => !slot.value);
    if (unfilledSlot) {
      return {
        entity: unfilledSlot.entity,
        description: unfilledSlot.description || `Please specify ${unfilledSlot.entity}`
      };
    }
    return null;
  }

  // Get filled slots for action execution
  getFilledSlots(): { [key: string]: any } {
    const filledSlots: { [key: string]: any } = {};
    this.context.unfilled_slots
      .filter(slot => slot.value !== null && slot.value !== undefined)
      .forEach(slot => {
        filledSlots[slot.entity] = slot.value;
      });
    return filledSlots;
  }

  // Clear the current conversation context
  resetContext(): void {
    this.context = {
      current_intent: null,
      unfilled_slots: [],
      conversation_history: [],
      app_state_snapshot: this.createEmptySnapshot()
    };
    
    this.dialogueState = {
      currentIntent: undefined,
      pendingSlots: {},
      context: this.context,
      isWaitingForResponse: false
    };
  }

  // Get conversation context for LLM
  getConversationContext(): ConversationContext {
    return this.context;
  }

  // Update app state snapshot
  updateAppStateSnapshot(snapshot: AppStateSnapshot): void {
    this.context.app_state_snapshot = snapshot;
  }

  // Get current dialogue state
  getDialogueState(): DialogueState {
    return this.dialogueState;
  }

  // Set waiting state
  setWaitingForResponse(waiting: boolean): void {
    this.dialogueState.isWaitingForResponse = waiting;
  }

  // Handle follow-up responses that might fill pending slots
  processFollowUpResponse(text: string, entities: any[]): { slotsUpdated: boolean; stillMissing: string[] } {
    let slotsUpdated = false;
    const providedSlots = this.extractSlots(entities);
    
    // Try to fill any pending slots
    for (const [slotName, value] of Object.entries(providedSlots)) {
      if (this.fillSlot(slotName, value)) {
        slotsUpdated = true;
      }
    }
    
    // Check for simple text-based slot filling for common cases
    if (this.context.unfilled_slots.length > 0) {
      const normalizedText = text.toLowerCase().trim();
      
      // Handle simple yes/no responses for confirmation
      if (normalizedText.match(/\b(yes|yeah|yep|ok|okay|sure|confirm|do it)\b/)) {
        const confirmationSlot = this.context.unfilled_slots.find(slot => slot.entity === 'confirmation');
        if (confirmationSlot) {
          this.fillSlot('confirmation', true);
          slotsUpdated = true;
        }
      }
      
      // Handle axis selection (x or y)
      if (this.context.unfilled_slots.find(slot => slot.entity === 'axis_name')) {
        if (normalizedText.includes('x')) {
          this.fillSlot('axis_name', 'x');
          slotsUpdated = true;
        } else if (normalizedText.includes('y')) {
          this.fillSlot('axis_name', 'y');
          slotsUpdated = true;
        }
      }
      
      // Handle property values when missing
      if (this.context.unfilled_slots.find(slot => slot.entity === 'property_value')) {
        // Handle marker shapes
        const shapeMatch = normalizedText.match(/\b(cross|circle|diamond|square|star|triangle|x|plus|\+)\b/);
        if (shapeMatch) {
          let shapeValue = shapeMatch[0];
          // Apply the same mapping as NLU service:
          // "cross" -> 'x' (X-style marker)  
          // "plus" or "+" -> 'cross' (+-style marker)
          if (shapeValue === 'cross') {
            shapeValue = 'x';
          } else if (shapeValue === '+' || shapeValue === 'plus') {
            shapeValue = 'cross';
          }
          this.fillSlot('property_value', shapeValue);
          slotsUpdated = true;
        }
        
        // Handle color names
        const colorMatch = normalizedText.match(/\b(red|blue|green|yellow|orange|purple|black|white|gray|grey)\b/);
        if (colorMatch) {
          this.fillSlot('property_value', colorMatch[0]);
          slotsUpdated = true;
        }
        
        // Handle opacity percentages
        const percentageMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*%/);
        if (percentageMatch) {
          const percentage = parseFloat(percentageMatch[1]);
          const opacityValue = (percentage / 100).toString();
          this.fillSlot('property_value', opacityValue);
          slotsUpdated = true;
        }
        
        // Handle decimal opacity values
        const decimalMatch = normalizedText.match(/\b(0\.\d+)\b/);
        if (decimalMatch) {
          this.fillSlot('property_value', decimalMatch[1]);
          slotsUpdated = true;
        }
        
        // Handle numeric values
        const numberMatch = normalizedText.match(/\b(\d+(?:\.\d+)?)\b/);
        if (numberMatch && !percentageMatch && !decimalMatch) {
          this.fillSlot('property_value', numberMatch[0]);
          slotsUpdated = true;
        }
        
        // Handle "blank", "transparent", "clear" for background
        const transparentMatch = normalizedText.match(/\b(blank|transparent|clear|none)\b/);
        if (transparentMatch) {
          this.fillSlot('property_value', 'transparent');
          slotsUpdated = true;
        }
      }
      
      // Handle styling property when missing
      if (this.context.unfilled_slots.find(slot => slot.entity === 'styling_property')) {
        // Handle direct property name responses like "shape", "color", "size"
        if (/^\s*(shape)\s*$/i.test(normalizedText)) {
          this.fillSlot('styling_property', 'shape');
          slotsUpdated = true;
        } else if (/^\s*(color|colour)\s*$/i.test(normalizedText)) {
          this.fillSlot('styling_property', 'color');
          slotsUpdated = true;
        } else if (/^\s*(size)\s*$/i.test(normalizedText)) {
          this.fillSlot('styling_property', 'size');
          slotsUpdated = true;
        } else if (/^\s*(opacity)\s*$/i.test(normalizedText)) {
          this.fillSlot('styling_property', 'opacity');
          slotsUpdated = true;
        } else if (/^\s*(thickness)\s*$/i.test(normalizedText)) {
          this.fillSlot('styling_property', 'thickness');
          slotsUpdated = true;
        }
      }
      
      // Handle chart element when missing  
      if (this.context.unfilled_slots.find(slot => slot.entity === 'chart_element')) {
        const elementMatch = normalizedText.match(/\b(fitted curve|fitted line|line|curve|markers?|points?|background|axes|axis|legend)\b/);
        if (elementMatch) {
          let element = elementMatch[0];
          // Normalize common variations
          if (element.includes('fitted')) {
            element = 'fitted curve';
          } else if (element.includes('marker') || element.includes('point')) {
            element = 'markers';
          }
          this.fillSlot('chart_element', element);
          slotsUpdated = true;
        }
      }
    }
    
    // Return which slots are still missing
    const stillMissing = this.context.unfilled_slots
      .filter(slot => !slot.value)
      .map(slot => slot.entity);
    
    return { slotsUpdated, stillMissing };
  }

  // Extract slots from entities array
  private extractSlots(entities: any[]): { [key: string]: any } {
    const slots: { [key: string]: any } = {};
    
    entities.forEach(entity => {
      if (entity.entity && entity.value !== undefined) {
        slots[entity.entity] = entity.value;
      }
    });
    
    return slots;
  }

  // Get required slots for an intent
  private getRequiredSlotsForIntent(intent: IntentType): Array<{entity: string, description?: string}> {
    const slotDefinitions: { [key: string]: Array<{entity: string, description?: string}> } = {
      'style_chart': [
        { entity: 'chart_element', description: 'What part of the chart do you want to style?' },
        { entity: 'styling_property', description: 'What property do you want to change?' }
      ],
      'style_line': [
        { entity: 'chart_element', description: 'Which line do you want to style?' },
        { entity: 'styling_property', description: 'What property do you want to change?' }
      ],
      'style_markers': [
        { entity: 'chart_element', description: 'Which markers do you want to style?' },
        { entity: 'styling_property', description: 'What property do you want to change?' }
      ],
      'change_axis_label': [
        { entity: 'axis_name', description: 'Which axis? (x or y)' },
        { entity: 'property_value', description: 'What should the new label be?' }
      ],
      'toggle_legend': [],
      'export_chart': []
    };
    
    return slotDefinitions[intent] || [];
  }

  // Create empty app state snapshot
  private createEmptySnapshot(): AppStateSnapshot {
    return {
      currentSheet: '',
      availableSheets: [],
      selectedColumns: [],
      fittingResults: null,
      chartConfig: {},
      analysisResults: {}
    };
  }
}
