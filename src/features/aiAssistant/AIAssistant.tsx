import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  AIMessage, 
  AIAssistantConfig, 
  AI_PERSONAS, 
  LLM_MODELS,
  IntentType
} from './ai.types';
import { AppStateSetters, AppStateGetters } from './Action.service';
import NLUService from './NLU.service';
import { DialogueService } from './Dialogue.service';
import LLMService from './LLM.service';
import ActionService from './Action.service';
import ApiKeySettings from './ApiKeySettings';

interface AIAssistantProps {
  appSetters: AppStateSetters;
  appGetters: AppStateGetters;
  className?: string;
}

// Icon components for modern look
const UserIcon = () => (
  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  </div>
);

const AIIcon = () => (
  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md animate-pulse">
    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  </div>
);

const AIAssistant: React.FC<AIAssistantProps> = ({ appSetters, appGetters, className = '' }) => {
  // Configuration state
  const [config, setConfig] = useState<AIAssistantConfig>({
    selectedPersona: 'sane',
    selectedModel: 'deepseek/deepseek-r1:free',
    isEnabled: true,
    debugMode: false
  });

  // Chat state
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant for PhenoFit-Pro. I can help you style charts, adjust parameters, run analyses, and answer questions about phenological data. What would you like to do?',
      timestamp: Date.now()
    }
  ]);
  
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isPersonaDropdownOpen, setIsPersonaDropdownOpen] = useState(false);
  const [isApiKeySettingsOpen, setIsApiKeySettingsOpen] = useState(false);
  const [failureCount, setFailureCount] = useState(0);
  const [canStopProcessing, setCanStopProcessing] = useState(false);
  const [currentAbortController, setCurrentAbortController] = useState<AbortController | null>(null);
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState(LLMService.isConfigured());

  // Refs for handling clicks outside dropdowns
  const configRef = useRef<HTMLDivElement>(null);
  const personaDropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get DialogueService instance
  const dialogueService = DialogueService.getInstance();

  // Check API key configuration periodically
  useEffect(() => {
    const checkApiKeyStatus = () => {
      const currentStatus = LLMService.isConfigured();
      if (currentStatus !== isApiKeyConfigured) {
        console.log('API key configuration changed:', currentStatus);
        setIsApiKeyConfigured(currentStatus);
      }
    };

    // Check immediately
    checkApiKeyStatus();

    // Check every 5 seconds to catch external changes
    const interval = setInterval(checkApiKeyStatus, 5000);

    return () => clearInterval(interval);
  }, [isApiKeyConfigured]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (configRef.current && !configRef.current.contains(event.target as Node)) {
        setIsConfigOpen(false);
      }
      if (personaDropdownRef.current && !personaDropdownRef.current.contains(event.target as Node)) {
        setIsPersonaDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize services
  useEffect(() => {
    console.log("Initializing ActionService with:", { appSetters, appGetters });
    try {
      ActionService.initialize(appSetters, appGetters);
      console.log("ActionService initialized successfully");
    } catch (error) {
      console.error("Failed to initialize ActionService:", error);
    }
    
    // Load saved config
    const savedConfig = localStorage.getItem('ai_assistant_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to load AI config:', error);
      }
    }
  }, [appSetters, appGetters]);

  // Save config changes
  useEffect(() => {
    localStorage.setItem('ai_assistant_config', JSON.stringify(config));
  }, [config]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keep input focused for continuous typing
  useEffect(() => {
    if (inputRef.current && !isProcessing) {
      inputRef.current.focus();
    }
  }, [isProcessing, messages]);

  const addMessage = useCallback((message: Omit<AIMessage, 'id' | 'timestamp'>) => {
    const newMessage: AIMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // More unique ID
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, newMessage]);
    dialogueService.addMessage(newMessage);
    
    return newMessage;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<AIMessage>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === id ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  const handleStopProcessing = useCallback(() => {
    console.log('Stop processing requested');
    
    // Abort ongoing LLM request if any
    if (currentAbortController) {
      currentAbortController.abort();
      setCurrentAbortController(null);
    }
    
    // Reset processing state
    setIsProcessing(false);
    setCanStopProcessing(false);
    
    // Add a message indicating the process was stopped
    addMessage({
      role: 'assistant',
      content: 'Processing stopped by user.'
    });
  }, [currentAbortController, addMessage]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    // If currently processing, this becomes a stop action
    if (isProcessing && canStopProcessing) {
      handleStopProcessing();
      return;
    }
    
    if (isProcessing) return; // Still processing but can't stop yet
    
    if (!config.isEnabled) {
      addMessage({
        role: 'assistant',
        content: 'AI Assistant is currently disabled. Please enable it in the settings.'
      });
      return;
    }

    const userInput = inputText.trim();
    setInputText('');
    setIsProcessing(true);
    setCanStopProcessing(false); // Can't stop until we determine if LLM will be called

    // Create abort controller for this request
    const abortController = new AbortController();
    setCurrentAbortController(abortController);

    // Add user message
    addMessage({
      role: 'user',
      content: userInput
    });

    // Add placeholder assistant message
    const assistantMessage = addMessage({
      role: 'assistant',
      content: '...'
    });

    try {
      // Get current context for follow-up commands
      const currentContext = dialogueService.getConversationContext();
      
      // Parse user input with NLU, passing context for follow-up commands
      const nluResult = await NLUService.parse(userInput, currentContext);
      
      console.log('User input:', userInput);
      console.log('NLU Result:', nluResult);
      console.log('API Key configured:', isApiKeyConfigured);
      
      if (config.debugMode) {
        console.log('Debug Mode - NLU Result:', nluResult);
      }

      // Handle different intents
      let response = '';
      
      if (nluResult.intent === 'unknown') {
        // Handle fallback with LLM
        setFailureCount(prev => prev + 1);
        
        if (!isApiKeyConfigured) {
          response = 'I didn\'t understand that. Please configure the OpenRouter API key in settings to enable advanced AI responses, or try rephrasing your request with more specific terms.';
        } else {
          // Allow stopping since we're about to call LLM
          setCanStopProcessing(true);
          
          try {
            const persona = LLMService.getPersonaById(config.selectedPersona);
            if (persona) {
              // Check if aborted before making request
              if (abortController.signal.aborted) {
                throw new Error('Request aborted');
              }
              
              const llmResponse = await LLMService.generateFallbackResponse(
                persona, 
                userInput, 
                config.selectedModel, 
                failureCount,
                abortController.signal
              );
              response = llmResponse.content;
            } else {
              response = 'I didn\'t understand that. Could you please rephrase your request?';
            }
          } catch (error) {
            console.error('LLM Error:', error);
            if (error instanceof Error && error.message === 'Request aborted') {
              response = 'Request stopped by user.';
            } else {
              response = 'I didn\'t understand that. Please try rephrasing your request with more specific terms.';
            }
          }
        }
      } else if (nluResult.intent === 'chitchat') {
        // Handle chitchat
        if (!isApiKeyConfigured) {
          response = 'Hello! I\'d love to chat, but I need an OpenRouter API key to be configured first. You can set this up in the settings.';
        } else {
          // Allow stopping since we're about to call LLM
          setCanStopProcessing(true);
          
          try {
            const persona = LLMService.getPersonaById(config.selectedPersona);
            
            if (persona) {
              // Check if aborted before making request
              if (abortController.signal.aborted) {
                throw new Error('Request aborted');
              }
              
              const llmResponse = await LLMService.generateChitchatResponse(
                persona, 
                userInput, 
                config.selectedModel,
                abortController.signal
              );
              response = llmResponse.content;
            } else {
              response = 'Hello! How can I help you with your phenological analysis today?';
            }
          } catch (error) {
            console.error('Chitchat LLM Error:', error);
            
            // More specific error handling for chitchat
            if (error instanceof Error) {
              if (error.message === 'Request aborted') {
                response = 'Chat stopped by user.';
              } else if (error.message.includes('limit exceeded') || error.message.includes('quota')) {
                response = 'Our API request limit exceeded. Please either use your own OpenRouter API key (which can be obtained for free at https://openrouter.ai/settings/keys), or wait 24 hours before resuming chat again. 🔑';
              } else if (error.message.includes('API key')) {
                response = 'I need an OpenRouter API key to chat properly. Please configure it in settings! 🔑';
              } else if (error.message.includes('Network error')) {
                response = 'Oops, network issues! Check your internet connection. 🌐';
              } else if (error.message.includes('Empty content')) {
                response = 'The AI service returned an empty response. This might be due to content filtering or API issues. Please try rephrasing your message or try again later.';
              } else {
                response = `I encountered an issue: ${error.message}. Please try again or contact support if this persists.`;
              }
            } else {
              response = 'Hello! I had trouble processing that. How can I help you with your phenological analysis today?';
            }
          }
        }
      } else if (nluResult.intent === 'question') {
        // Handle definition requests
        if (!isApiKeyConfigured) {
          response = 'I can help explain terms, but I need an OpenRouter API key configured for detailed explanations. Please set this up in settings.';
        } else {
          // Allow stopping since we're about to call LLM
          setCanStopProcessing(true);
          
          try {
            const persona = LLMService.getPersonaById(config.selectedPersona);
            // Extract topic from entities or use a simple approach
            const topic = nluResult.entities[0]?.value || 'phenological concepts';
            
            if (persona) {
              // Check if aborted before making request
              if (abortController.signal.aborted) {
                throw new Error('Request aborted');
              }
              
              const llmResponse = await LLMService.generateDefinitionResponse(
                persona, 
                topic, 
                userInput, 
                config.selectedModel,
                abortController.signal
              );
              response = llmResponse.content;
            } else {
              response = `I'd be happy to explain ${topic}, but I need more configuration to provide detailed explanations.`;
            }
          } catch (error) {
            console.error('LLM Error:', error);
            if (error instanceof Error && error.message === 'Request aborted') {
              response = 'Definition request stopped by user.';
            } else {
              response = 'I can help with definitions, but I\'m having trouble accessing my knowledge base right now.';
            }
          }
        }
      } else {
        // Check if we're in the middle of a conversation (waiting for clarification)
        const currentContext = dialogueService.getConversationContext();
        
        // First check if this is a new clear command that should override any pending dialogue
        const actionableIntents: IntentType[] = ['chart_styling', 'model_configuration', 'data_analysis', 'parameter_adjustment', 'STYLE_CHART_ELEMENT', 'SET_CURVE_MODEL', 'QUERY_DATA', 'ADJUST_MODEL_PARAMETER', 'EXECUTE_ACTION', 'MANAGE_VIEW'];
        
        // A command is only "new and clear" if it's actionable AND not a simple follow-up response
        // Simple follow-up responses are typically single words or short phrases
        const isSimpleFollowUp = userInput.trim().split(/\s+/).length <= 2; // 1-2 words
        const isNewClearCommand = actionableIntents.includes(nluResult.intent) && nluResult.confidence > 0.8 && !isSimpleFollowUp;
        
        if (currentContext.current_intent && currentContext.unfilled_slots.length > 0 && !isNewClearCommand) {
          // We're waiting for clarification - try to process the follow-up response
          const followUpResult = dialogueService.processFollowUpResponse(userInput, nluResult.entities);
          
          if (followUpResult.slotsUpdated) {
            // Some slots were filled, check if we can proceed
            if (followUpResult.stillMissing.length === 0) {
              // All slots filled, execute the action
              const slots = dialogueService.getCurrentSlots();
              console.log('Executing action with intent:', currentContext.current_intent, 'and slots:', slots);
              
              // Convert slots object to Entity array format
              const entities = Object.entries(slots).map(([entity, value]) => ({ 
                entity, 
                value, 
                confidence: 1.0 
              }));
              
              const actionResult = await ActionService.executeAction(
                currentContext.current_intent as IntentType,
                entities
              );
              
              dialogueService.setLastActionResult(actionResult);
              
              if (!LLMService.isConfigured() || !actionResult.success) {
                response = actionResult.message;
              } else {
                // Allow stopping since we're about to call LLM for persona response
                setCanStopProcessing(true);
                
                // Generate persona-based response
                try {
                  const persona = LLMService.getPersonaById(config.selectedPersona);
                  if (persona) {
                    // Check if aborted before making request
                    if (abortController.signal.aborted) {
                      throw new Error('Request aborted');
                    }
                    
                    const context = dialogueService.getConversationSummary();
                    const llmResponse = await LLMService.generatePersonaResponse(
                      persona,
                      actionResult,
                      userInput,
                      config.selectedModel,
                      context,
                      abortController.signal
                    );
                    response = llmResponse.content;
                  } else {
                    response = actionResult.message;
                  }
                } catch (error) {
                  console.error('LLM Error:', error);
                  if (error instanceof Error && error.message === 'Request aborted') {
                    response = actionResult.message + ' (Response generation stopped by user)';
                  } else {
                    response = actionResult.message;
                  }
                }
              }
              
              // Clear current intent after successful action
              if (actionResult.success) {
                dialogueService.clearCurrentIntent();
                setFailureCount(0);
              }
            } else {
              // Still missing some slots, ask for the next missing one
              response = dialogueService.generateClarificationQuestion(followUpResult.stillMissing);
            }
          } else {
            // No slots were filled from the follow-up, ask again
            response = dialogueService.generateClarificationQuestion(followUpResult.stillMissing);
          }
        } else {
          // Handle new action-based intents (or clear command that overrides pending dialogue)
          if (isNewClearCommand && currentContext.current_intent && currentContext.unfilled_slots.length > 0) {
            console.log('New clear command detected, clearing old dialogue state:', currentContext.current_intent);
            dialogueService.clearCurrentIntent();
          }
          
          const intentResult = dialogueService.setCurrentIntent(nluResult.intent as IntentType, nluResult.entities);
          
          if (intentResult.needsClarification) {
            response = dialogueService.generateClarificationQuestion(intentResult.missingSlots);
          } else {
            // Execute the action
            console.log('Executing action with intent:', nluResult.intent, 'and entities:', nluResult.entities);
            const actionResult = await ActionService.executeAction(
              nluResult.intent,
              nluResult.entities
            );
            
            dialogueService.setLastActionResult(actionResult);
            
            if (!LLMService.isConfigured() || !actionResult.success) {
              response = actionResult.message;
            } else {
              // Allow stopping since we're about to call LLM for persona response
              setCanStopProcessing(true);
              
              // Generate persona-based response
              try {
                const persona = LLMService.getPersonaById(config.selectedPersona);
                if (persona) {
                  // Check if aborted before making request
                  if (abortController.signal.aborted) {
                    throw new Error('Request aborted');
                  }
                  
                  const context = dialogueService.getConversationSummary();
                  const llmResponse = await LLMService.generatePersonaResponse(
                    persona,
                    actionResult,
                    userInput,
                    config.selectedModel,
                    context,
                    abortController.signal
                  );
                  response = llmResponse.content;
                } else {
                  response = actionResult.message;
                }
              } catch (error) {
                console.error('LLM Error:', error);
                if (error instanceof Error && error.message === 'Request aborted') {
                  response = actionResult.message + ' (Response generation stopped by user)';
                } else {
                  response = actionResult.message;
                }
              }
            }
            
            // Clear current intent after successful action
            if (actionResult.success) {
              dialogueService.clearCurrentIntent();
              setFailureCount(0); // Reset failure count on success
            }
          }
        }
      }

      // Update assistant message
      updateMessage(assistantMessage.id, {
        content: response
      });

    } catch (error) {
      console.error('Message processing error:', error);
      // Only update the assistant message with error, never touch the user message
      updateMessage(assistantMessage.id, {
        content: error instanceof Error && error.message.includes('limit exceeded') 
          ? 'Our API request limit exceeded. Please either use your own OpenRouter API key (which can be obtained for free at https://openrouter.ai/settings/keys), or wait 24 hours before resuming chat again. 🔑'
          : 'Sorry, I encountered an error processing your request. Please try again.'
      });
    } finally {
      setIsProcessing(false);
      setCanStopProcessing(false);
      setCurrentAbortController(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: 'Chat cleared. How can I help you with your phenological analysis?',
      timestamp: Date.now()
    }]);
    dialogueService.clearCurrentIntent();
    setFailureCount(0);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const testConnection = async () => {
    if (!isApiKeyConfigured) {
      addMessage({
        role: 'assistant',
        content: 'Please configure your OpenRouter API key first.'
      });
      return;
    }

    setIsProcessing(true);
    try {
      const success = await LLMService.testConnection(config.selectedModel);
      addMessage({
        role: 'assistant',
        content: success 
          ? 'Connection test successful! AI features are working properly.' 
          : 'Connection test failed. Please check your API key and model selection.'
      });
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: 'Connection test failed. Please check your API key and internet connection.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPersona = AI_PERSONAS.find(p => p.id === config.selectedPersona);

  return (
    <div className={`flex flex-col h-full bg-panel-bg ${className}`}>
      {/* Modern Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-sm"></div>
          <h3 className="font-semibold text-on-panel-primary text-sm">AI Assistant</h3>
          
          {/* Compact Persona Selector - Just Emoji */}
          <div className="relative" ref={personaDropdownRef}>
            <button
              onClick={() => setIsPersonaDropdownOpen(!isPersonaDropdownOpen)}
              className="flex items-center gap-1 px-2 py-1 text-lg hover:bg-item-hover-on-panel rounded-lg border border-panel-border shadow-sm transition-all duration-200 hover:shadow-md"
              title={`Current: ${currentPersona?.name || 'Sane'}`}
            >
              <span>{currentPersona?.emoji || '🤖'}</span>
              <svg className={`w-3 h-3 text-on-panel-secondary transition-transform ${isPersonaDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isPersonaDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-panel-border rounded-lg shadow-xl z-20 overflow-hidden">
                {AI_PERSONAS.map(persona => (
                  <button
                    key={persona.id}
                    onClick={() => {
                      setConfig(prev => ({ ...prev, selectedPersona: persona.id }));
                      setIsPersonaDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                      config.selectedPersona === persona.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-on-panel-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{persona.emoji}</span>
                      <div>
                        <div className="font-medium">{persona.name}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsApiKeySettingsOpen(!isApiKeySettingsOpen)}
            className="p-2 text-on-panel-secondary hover:text-on-panel-primary hover:bg-item-hover-on-panel rounded-lg transition-all duration-200 hover:shadow-md"
            title="API Key Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3.586l8.257-8.257A6 6 0 0119 9z" />
            </svg>
          </button>
          
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="p-2 text-on-panel-secondary hover:text-on-panel-primary hover:bg-item-hover-on-panel rounded-lg transition-all duration-200 hover:shadow-md"
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Modern Configuration Panel */}
      {isConfigOpen && (
        <div ref={configRef} className="border-b border-panel-border bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-on-panel-primary mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  LLM Model
                </label>
                <select
                  value={config.selectedModel}
                  onChange={(e) => setConfig(prev => ({ ...prev, selectedModel: e.target.value }))}
                  className="w-full text-sm p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-on-panel-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  {LLM_MODELS.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.cost})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-panel-primary mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  API Key Status
                </label>
                <div className="w-full text-sm p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-on-panel-primary">
                  {isApiKeyConfigured ? (
                    <span className="text-green-600 dark:text-green-400">✅ API Key Configured</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">❌ API Key Not Configured</span>
                  )}
                  <div className="mt-2">
                    <button
                      onClick={() => setIsApiKeySettingsOpen(true)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline"
                    >
                      Configure API Key →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.isEnabled}
                    onChange={(e) => setConfig(prev => ({ ...prev, isEnabled: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm text-on-panel-secondary">Enable AI</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.debugMode}
                    onChange={(e) => setConfig(prev => ({ ...prev, debugMode: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm text-on-panel-secondary">Debug</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={testConnection}
                  disabled={isProcessing || !isApiKeyConfigured}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Test Connection
                </button>
                <button
                  onClick={clearChat}
                  className="px-3 py-1.5 bg-gradient-to-r from-gray-400 to-gray-500 text-white text-sm rounded-lg hover:from-gray-500 hover:to-gray-600 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Clear Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Key Settings Panel */}
      {isApiKeySettingsOpen && (
        <div className="border-b border-panel-border bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
          <div className="p-4">
            <ApiKeySettings 
              isOpen={isApiKeySettingsOpen}
              onClose={() => {
                setIsApiKeySettingsOpen(false);
                // Refresh API key configuration status
                setIsApiKeyConfigured(LLMService.isConfigured());
              }} 
            />
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0 bg-gradient-to-b from-gray-50/30 to-transparent dark:from-gray-900/30">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 items-start ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
          >
            {message.role === 'assistant' && <AIIcon />}
            
            <div
              className={`max-w-[85%] transition-all duration-200 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md shadow-md'
                  : 'bg-white dark:bg-gray-800 text-on-panel-primary rounded-2xl rounded-bl-md border border-gray-200 dark:border-gray-700 shadow-md'
              }`}
            >
              <div className="p-4">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            </div>
            
            {message.role === 'user' && <UserIcon />}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Direct Input - No separate box */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-t border-panel-border">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                config.isEnabled 
                  ? "Type your message directly here..." 
                  : "AI Assistant is disabled"
              }
              disabled={!config.isEnabled || isProcessing}
              rows={1}
              className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-on-panel-primary placeholder-on-panel-muted rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:opacity-50 text-sm transition-all duration-200"
              style={{ minHeight: '48px', maxHeight: '120px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!config.isEnabled || (!inputText.trim() && !isProcessing)}
            className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg"
            title={isProcessing && canStopProcessing ? "Stop processing" : isProcessing ? "Processing..." : "Send message"}
          >
            {isProcessing ? (
              canStopProcessing ? (
                // Stop icon when processing can be stopped
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1"/>
                </svg>
              ) : (
                // Loading spinner when processing but can't stop yet
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )
            ) : (
              // Send icon when not processing
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
