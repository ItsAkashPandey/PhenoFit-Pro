// LLM Service for OpenRouter API Integration
import { AIPersona, LLMModel, AI_PERSONAS, LLM_MODELS } from './ai.types';

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  abortSignal?: AbortSignal;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}

export class LLMService {
  private static instance: LLMService;
  private apiKey: string = '';
  private baseURL = 'https://openrouter.ai/api/v1/chat/completions';
  
  // Multiple API keys for fallback (users can add their own)
  private apiKeys: string[] = [];
  private currentApiKeyIndex: number = 0;
  
  private constructor() {
    const primaryKey = localStorage.getItem('openrouter_api_key') || 
                     import.meta.env.VITE_OPENROUTER_API_KEY || '';
    
    const storedKeysJson = localStorage.getItem('openrouter_api_keys');
    let storedKeys: string[] = [];
    if (storedKeysJson) {
      try {
        const parsed = JSON.parse(storedKeysJson);
        if (Array.isArray(parsed)) {
          storedKeys = parsed;
        }
      } catch (e) {
        console.warn('Failed to parse stored API keys');
      }
    }

    const allKeys = new Set(storedKeys);
    if (primaryKey) {
      allKeys.add(primaryKey);
    }

    this.apiKeys = Array.from(allKeys);

    if (primaryKey && this.apiKeys.includes(primaryKey)) {
      this.apiKey = primaryKey;
      this.currentApiKeyIndex = this.apiKeys.indexOf(primaryKey);
    } else if (this.apiKeys.length > 0) {
      this.apiKey = this.apiKeys[0];
      this.currentApiKeyIndex = 0;
    } else {
      this.apiKey = '';
      this.currentApiKeyIndex = 0;
    }
    
    localStorage.setItem('openrouter_api_keys', JSON.stringify(this.apiKeys));
  }
  
  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  // Set API key
  setApiKey(apiKey: string): void {
    const trimmedKey = apiKey.trim();
    this.apiKey = trimmedKey;

    const existingKeys = new Set(this.apiKeys);
    existingKeys.add(trimmedKey);
    this.apiKeys = Array.from(existingKeys);

    this.currentApiKeyIndex = this.apiKeys.indexOf(trimmedKey);

    localStorage.setItem('openrouter_api_key', trimmedKey);
    localStorage.setItem('openrouter_api_keys', JSON.stringify(this.apiKeys));
  }

  // Add multiple API keys for fallback
  addApiKeys(apiKeys: string[]): void {
    this.apiKeys = [...new Set([...this.apiKeys, ...apiKeys])]; // Remove duplicates
    localStorage.setItem('openrouter_api_keys', JSON.stringify(this.apiKeys));
    
    // If no primary key is set, use the first one
    if (!this.apiKey && this.apiKeys.length > 0) {
      this.apiKey = this.apiKeys[0];
      this.currentApiKeyIndex = 0;
      localStorage.setItem('openrouter_api_key', this.apiKey);
    }
  }

  // Get all configured API keys (masked for security)
  getApiKeys(): string[] {
    return this.apiKeys.map(key => 
      key.length > 10 ? `${key.substring(0, 10)}...${key.substring(key.length - 4)}` : '***'
    );
  }

  // Remove an API key by index
  removeApiKey(index: number): void {
    if (index >= 0 && index < this.apiKeys.length) {
      const removedKey = this.apiKeys[index];
      this.apiKeys.splice(index, 1);
      localStorage.setItem('openrouter_api_keys', JSON.stringify(this.apiKeys));
      
      if (this.apiKey === removedKey) {
        if (this.apiKeys.length > 0) {
          this.currentApiKeyIndex = 0;
          this.apiKey = this.apiKeys[0];
          localStorage.setItem('openrouter_api_key', this.apiKey);
        } else {
          this.apiKey = '';
          this.currentApiKeyIndex = 0;
          localStorage.removeItem('openrouter_api_key');
        }
      } else {
        this.currentApiKeyIndex = this.apiKeys.indexOf(this.apiKey);
      }
    }
  }

  // Get current API key
  getApiKey(): string {
    return this.apiKey;
  }

  // Check if API key is configured
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  // Rotate to next API key
  private rotateApiKey(): boolean {
    if (this.apiKeys.length <= 1) return false;
    
    this.currentApiKeyIndex = (this.currentApiKeyIndex + 1) % this.apiKeys.length;
    this.apiKey = this.apiKeys[this.currentApiKeyIndex];
    console.log(`Rotated to API key ${this.currentApiKeyIndex + 1}/${this.apiKeys.length}`);
    return true;
  }

  // Check if error is due to quota/rate limit
  private isQuotaExceededError(error: any, responseData?: any): boolean {
    if (typeof error === 'string') {
      return error.includes('quota') || error.includes('rate limit') || error.includes('exceeded') || error.includes('429');
    }
    if (error.message) {
      return error.message.includes('quota') || error.message.includes('rate limit') || error.message.includes('exceeded') || error.message.includes('429');
    }
    if (responseData && responseData.error) {
      return responseData.error.code === 'insufficient_quota' || 
             responseData.error.code === 'rate_limit_exceeded' ||
             responseData.error.type === 'quota_exceeded';
    }
    return false;
  }

  // Generate text using LLM with API key rotation and quota handling
  async generateText(request: LLMRequest): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('AI Assistant requires an OpenRouter API key to function. Please configure your API key in the settings. You can get a free API key at https://openrouter.ai/settings/keys');
    }

    // Defensive check to ensure apiKeys is not empty if a primary key exists
    if (this.apiKeys.length === 0 && this.apiKey) {
      console.warn('LLMService: Recovering apiKeys array from the primary apiKey.');
      this.apiKeys = [this.apiKey];
      this.currentApiKeyIndex = 0;
    }

    const payload = {
      model: request.model,
      messages: [
        {
          role: 'system',
          content: request.systemPrompt
        },
        {
          role: 'user',
          content: request.userPrompt
        }
      ],
      // Removed max_tokens restriction - let models use their natural response length
      temperature: request.temperature || 0.7,
      stream: false
    };

    console.log('LLM Request payload:', JSON.stringify(payload, null, 2));

    let lastError: any = null;
    let attempts = 0;
    const maxAttempts = this.apiKeys.length;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(this.baseURL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': window.location.origin
          },
          body: JSON.stringify(payload),
          signal: request.abortSignal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Check if it's a quota/rate limit error
          if (response.status === 429 || this.isQuotaExceededError(errorData.error, errorData)) {
            console.log(`API quota exceeded for key ${this.currentApiKeyIndex + 1}, trying next key...`);
            
            if (this.rotateApiKey()) {
              attempts++;
              continue; // Try with next API key
            } else {
              // No more API keys to try
              throw new Error('API request limit exceeded. To continue using the AI Assistant, please add your own free OpenRouter API key at https://openrouter.ai/settings/keys. You can add it in the AI Assistant settings.');
            }
          }
          
          throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        // Better error handling and logging
        console.log('OpenRouter API Response:', data);
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          console.error('Invalid response structure:', data);
          throw new Error('Invalid response structure from OpenRouter API');
        }
        
        const content = data.choices[0].message.content;
        console.log('API Response content:', JSON.stringify(content));
        console.log('Content length:', content?.length || 0);
        console.log('Content trimmed length:', content?.trim().length || 0);
        
        if (!content || content.trim() === '') {
          console.error('Empty content received from API');
          console.error('Full API response:', JSON.stringify(data, null, 2));
          throw new Error('Empty content received from OpenRouter API');
        }
        
        // Success! Reset to first API key for next time
        if (this.currentApiKeyIndex !== 0) {
          this.currentApiKeyIndex = 0;
          this.apiKey = this.apiKeys[0];
        }
        
        return {
          content: content,
          usage: data.usage ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens
          } : undefined,
          model: data.model || request.model,
          finishReason: data.choices[0]?.finish_reason
        };
        
      } catch (error) {
        lastError = error;
        
        if (error instanceof Error && this.isQuotaExceededError(error)) {
          if (this.rotateApiKey()) {
            attempts++;
            continue; // Try with next API key
          }
        }
        
        // If it's not a quota error, don't retry
        break;
      }
    }

    // All API keys failed or non-quota error
    console.error('LLM API Error:', lastError);
    
    // Provide more specific error messages
    if (lastError instanceof Error) {
      if (lastError.message.includes('API key')) {
        throw new Error('AI Assistant requires an OpenRouter API key. Please add your free API key from https://openrouter.ai/settings/keys in the AI settings.');
      } else if (lastError.message.includes('quota') || lastError.message.includes('limit exceeded')) {
        throw new Error('API request limit exceeded. Please add your own free OpenRouter API key from https://openrouter.ai/settings/keys to continue using the AI Assistant.');
      } else if (lastError.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to OpenRouter API. Please check your internet connection.');
      } else {
        throw lastError;
      }
    }
    throw new Error('Failed to generate response from AI model. Please check your API key configuration.');
  }

  // Generate persona-based response
  async generatePersonaResponse(
    persona: AIPersona, 
    actionResult: { success: boolean; message: string; data?: any }, 
    userQuery: string,
    model: string,
    conversationContext?: string,
    abortSignal?: AbortSignal
  ): Promise<LLMResponse> {
    
    const contextSection = conversationContext ? 
      `\n\nConversation Context:\n${conversationContext}` : '';
    
    const systemPrompt = `${persona.systemPrompt}

You are responding to a user in the PhenoFit-Pro application after an action was executed.

Action Result: ${JSON.stringify(actionResult)}
User's Original Query: "${userQuery}"${contextSection}

CRITICAL: Keep your response SHORT and CONCISE. Maximum 1-2 sentences. Stay in character but be brief.`;

    const userPrompt = actionResult.success ? 
      `The action was completed successfully: ${actionResult.message}` :
      `The action failed: ${actionResult.message}`;

    return this.generateText({
      systemPrompt,
      userPrompt,
      model,
      maxTokens: 80, // Reduced from 256 to force shorter responses
      temperature: 0.8,
      abortSignal
    });
  }

  // Generate fallback response for unrecognized queries
  async generateFallbackResponse(
    persona: AIPersona,
    userQuery: string,
    model: string,
    attemptNumber: number = 1,
    abortSignal?: AbortSignal
  ): Promise<LLMResponse> {
    const systemPrompt = `${persona.systemPrompt}

The user said something that the system didn't understand. This is attempt #${attemptNumber} to help them.

CRITICAL: Keep response SHORT. Maximum 1-2 sentences. Suggest what they can try in your personality style.

Examples they can try:
- "change the background color to blue"
- "use the LOESS model"  
- "what is the R² value?"
- "set baseline to 0.1"`;

    const userPrompt = `User said: "${userQuery}"\n\nI didn't understand that. Help them briefly with examples.`;

    return this.generateText({
      systemPrompt,
      userPrompt,
      model,
      maxTokens: 60,
      temperature: 0.7,
      abortSignal
    });
  }

  // Generate chitchat response
  async generateChitchatResponse(
    persona: AIPersona,
    userQuery: string,
    model: string,
    abortSignal?: AbortSignal
  ): Promise<LLMResponse> {
    
    const systemPrompt = `${persona.systemPrompt}

The user is making casual conversation.

CRITICAL: Keep response SHORT and punchy. Maximum 1-2 sentences. Be conversational in your personality style.`;

    const userPrompt = `User said: "${userQuery}"\n\nRespond conversationally in your persona.`;

    return this.generateText({
      systemPrompt,
      userPrompt,
      model,
      // Removed maxTokens restriction - let model respond naturally
      temperature: 0.9,
      abortSignal
    });
  }

  // Generate definition/explanation response
  async generateDefinitionResponse(
    persona: AIPersona,
    topic: string,
    userQuery: string,
    model: string,
    abortSignal?: AbortSignal
  ): Promise<LLMResponse> {
    
    const systemPrompt = `${persona.systemPrompt}

The user is asking for a definition or explanation about: "${topic}"

CRITICAL: Keep explanation SHORT and clear. Maximum 2-3 sentences. Stay in character but be educational and concise.`;

    const userPrompt = `User asked: "${userQuery}"\n\nExplain "${topic}" briefly in the context of remote sensing/GIS.`;

    return this.generateText({
      systemPrompt,
      userPrompt,
      model,
      // Removed maxTokens restriction - let model explain naturally
      temperature: 0.6,
      abortSignal
    });
  }

  // Get available personas
  getAvailablePersonas(): AIPersona[] {
    return AI_PERSONAS;
  }

  // Get available models
  getAvailableModels(): LLMModel[] {
    return LLM_MODELS;
  }

  // Get persona by ID
  getPersonaById(id: string): AIPersona | undefined {
    return AI_PERSONAS.find(p => p.id === id);
  }

  // Get model by ID
  getModelById(id: string): LLMModel | undefined {
    return LLM_MODELS.find(m => m.id === id);
  }

  // Test API connection with direct API call (bypasses validation)
  async testConnection(model: string = 'mistralai/mistral-7b-instruct'): Promise<boolean> {
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.error('No API key set for testing');
      return false;
    }

    try {
      const payload = {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.'
          },
          {
            role: 'user',
            content: 'Say "Connection test successful" and nothing else.'
          }
        ],
        max_tokens: 10,
        temperature: 0
      };

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': window.location.origin || 'https://itsakashpandey.github.io'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API test failed:', response.status, errorData);
        return false;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      console.log('Test connection response:', content);
      
      return content && content.includes('Connection test successful');
      
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

export default LLMService.getInstance();
