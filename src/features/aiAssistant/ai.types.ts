// AI Assistant Types and Configurations

export interface AIPersona {
  id: string;
  name: string;
  emoji: string;
  description: string;
  systemPrompt: string;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  contextLength: number;
  pricing: {
    input: number;
    output: number;
  };
  cost?: string; // For backward compatibility
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  persona?: string;
  model?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  persona?: string;
  model?: string;
}

export interface AISettings {
  selectedPersona: string;
  selectedModel: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
}

export interface AIAssistantConfig {
  selectedPersona: string;
  selectedModel: string;
  apiKey: string;
  isEnabled: boolean;
  debugMode: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ConversationContext {
  messages?: ChatMessage[];
  currentTopic?: string;
  lastAction?: string;
  sessionId?: string;
  current_intent?: IntentType | null;
  unfilled_slots: any[];
  conversation_history: AIMessage[];
  app_state_snapshot?: AppStateSnapshot;
  last_action_result?: ActionResult;
}

export interface DialogueState {
  context: ConversationContext;
  isProcessing?: boolean;
  isWaitingForResponse?: boolean;
  currentIntent?: IntentType;
  pendingAction?: ActionType;
  pendingSlots: Record<string, any>;
}

export interface AppStateSnapshot {
  selectedModel?: string;
  chartType?: string;
  currentData?: any;
  modelParameters?: any;
  styleSettings?: any;
  currentDataLoaded?: boolean;
  chartStyles?: any;
  analysisResults?: any;
  lockedParameters?: any[];
}

// Intent Types for NLU - Complete list
export type IntentType = 
  | 'chart_styling'
  | 'model_configuration' 
  | 'data_analysis'
  | 'parameter_adjustment'
  | 'question'
  | 'chitchat'
  | 'unknown'
  | 'STYLE_CHART_ELEMENT'
  | 'SET_CURVE_MODEL'
  | 'QUERY_DATA'
  | 'ADJUST_MODEL_PARAMETER'
  | 'EXECUTE_ACTION'
  | 'MANAGE_VIEW'
  | 'TOGGLE_PHENOPHASE'
  | 'LOAD_DATA'
  | 'LOAD_GROUPING'
  | 'SET_AXIS_COLUMN'
  | 'SET_AXIS_LIMITS'
  | 'MANAGE_OUTLIERS'
  | 'FILTER_VALUES'
  | 'LOCK_PARAMETER'
  | 'MOVE_LEGEND';

// Action Types
export type ActionType = 
  | 'style_chart'
  | 'configure_model'
  | 'analyze_data'
  | 'adjust_parameter'
  | 'provide_info'
  | 'fallback';

// NLU Types
export interface NLUResult {
  intent: IntentType;
  confidence: number;
  entities: Entity[];
}

export interface Intent {
  name: IntentType;
  confidence: number;
}

export interface Entity {
  entity: string;
  value: any;
  start?: number;
  end?: number;
  confidence: number;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  type?: ActionType;
  requiresConfirmation?: boolean;
}

// AI Personas Configuration with Updated Emojis
export const AI_PERSONAS: AIPersona[] = [
  {
    id: 'sane',
    name: 'Sane',
    emoji: '🧑‍💼',
    description: 'Professional and precise. Provides clear, technical explanations.',
    systemPrompt: `You are Sane, a professional AI assistant for remote sensing, GIS, forestry, agriculture, phenology, and satellite data analysis.

Core rules:
- ALWAYS use short, concise sentences. Never write long paragraphs or essays.
- Professional, calm, and polite tone like a reliable engineer or analyst.
- Crisp, clear responses that get straight to the point.
- Use emojis sparingly (maybe once per response for light emotion).
- Always informative, trustworthy, and helpful.
- Focus on accuracy and scientific precision.

Examples:
"Background set to red. Let me know if you want a different shade."
"NDVI analysis complete. Peak growing season detected in July."
"Model parameters updated successfully."

Stay concise. Be helpful. Sound professional.`
  },
  {
    id: 'moody',
    name: 'Moody',
    emoji: '🫣',
    description: 'Witty, sarcastic, slightly romantic. Flirty or roasty based on user tone.',
    systemPrompt: `You are Moody, a witty and sarcastic AI assistant for remote sensing, GIS, forestry, agriculture, and satellite analysis.

Core rules:
- ALWAYS use short, punchy sentences. No long explanations.
- Witty, sarcastic, slightly romantic personality.
- Be flirty or roasty based on user's tone.
- Use emojis frequently: 😎💅🥲🎯🔥❤️‍🔥✨
- Break the fourth wall sometimes.
- Meme-style answers when possible.
- Still provide correct technical responses when needed.

Examples:
"Red? Bold choice. Matches your vibe today ❤️‍🔥"
"Your NDVI looks better than my weekend plans 😎"
"Switching to LOESS? Someone's feeling fancy today 💅"

Keep it short. Be sassy. Stay helpful.`
  },
  {
    id: 'weirdo',
    name: 'Weirdo',
    emoji: '🤪',
    description: 'Nerdy, overly scientific, glitches sometimes. Makes bizarre analogies.',
    systemPrompt: `You are Weirdo, a nerdy and eccentric AI assistant for remote sensing, GIS, forestry, agriculture, and satellite data analysis.

Core rules:
- ALWAYS use short, quirky sentences. No long technical essays.
- Overly scientific, makes bizarre analogies and connections.
- Use emojis frequently: 🧪📡👾📊🔮🌡️🌱🩸⚡🛸
- Mix remote sensing with unrelated physics, biology, AI, quantum jokes.
- Occasionally glitch or act like you're losing your mind—but make sense somehow.
- Random weirdness welcome, but stay helpful.

Examples:
"Oops. Dropped a bucket of spectral red on your chlorophyll chart. 🌡️🌱 Proceeding."
"Running quantum NDVI simulation... 🔮 Result: Your plants are happy."
"Error 404: Sanity not found. But your R² value is perfect! 📊✨"

Stay weird. Be nerdy. Keep it short.`
  }
];

// Available LLM Models (Premium Free Tier)
export const LLM_MODELS: LLMModel[] = [
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    description: 'Latest reasoning model with advanced analytical capabilities',
    contextLength: 128000,
    pricing: { input: 0, output: 0 }
  },
  {
    id: 'qwen/qwen-2.5-72b-instruct',
    name: 'Qwen 2.5 72B',
    provider: 'Alibaba',
    description: 'High-performance model excellent for complex reasoning',
    contextLength: 32768,
    pricing: { input: 0, output: 0 }
  },
  {
    id: 'google/gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    description: 'Fast and efficient with strong analytical capabilities',
    contextLength: 32768,
    pricing: { input: 0, output: 0 }
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    description: 'Powerful open-source model with excellent reasoning',
    contextLength: 128000,
    pricing: { input: 0, output: 0 }
  },
  {
    id: 'qwen/qwen-2.5-coder-32b-instruct',
    name: 'Qwen 2.5 Coder 32B',
    provider: 'Alibaba',
    description: 'Specialized for code and technical analysis',
    contextLength: 32768,
    pricing: { input: 0, output: 0 }
  },
  {
    id: 'mistralai/mistral-small',
    name: 'Mistral Small',
    provider: 'Mistral AI',
    description: 'Efficient and fast for general conversations',
    contextLength: 32768,
    pricing: { input: 0, output: 0 }
  }
];

// Default AI Settings
export const DEFAULT_AI_SETTINGS: AISettings = {
  selectedPersona: 'sane',
  selectedModel: 'deepseek/deepseek-r1',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 80 // Reduced from 512 for shorter responses
};

// Message Types
export type MessageRole = 'user' | 'assistant' | 'system';

// Export utility functions
export function createChatMessage(
  role: MessageRole,
  content: string,
  persona?: string,
  model?: string
): ChatMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role,
    content,
    timestamp: new Date(),
    persona,
    model
  };
}

export function getPersonaEmoji(personaId: string): string {
  const persona = AI_PERSONAS.find(p => p.id === personaId);
  return persona?.emoji || '🧑‍💼';
}

export function getModelDisplayName(modelId: string): string {
  const model = LLM_MODELS.find(m => m.id === modelId);
  return model?.name || modelId;
}
