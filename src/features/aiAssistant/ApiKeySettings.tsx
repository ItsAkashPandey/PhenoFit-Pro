import React, { useState, useEffect } from 'react';
import LLMService from './LLM.service';

interface ApiKeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Load current API key and list
      const currentKey = LLMService.getApiKey();
      setApiKey(currentKey);
      setApiKeys(LLMService.getApiKeys());
      setIsValid(null);
      setErrorMessage('');
    }
  }, [isOpen]);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setErrorMessage('Please enter an API key');
      return;
    }

    if (!apiKey.startsWith('sk-or-v1-')) {
      setErrorMessage('OpenRouter API keys should start with "sk-or-v1-"');
      return;
    }

    setIsTestingConnection(true);
    setErrorMessage('');

    try {
      // Test the API key
      LLMService.setApiKey(apiKey.trim());
      const testResult = await LLMService.testConnection();
      
      if (testResult) {
        setIsValid(true);
        setApiKeys(LLMService.getApiKeys());
        setErrorMessage('');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setIsValid(false);
        setErrorMessage('API key test failed. Please check if the key is valid and has sufficient quota.');
      }
    } catch (error) {
      setIsValid(false);
      const errorMsg = error instanceof Error ? error.message : 'Failed to test API key';
      setErrorMessage(errorMsg);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleRemoveKey = (index: number) => {
    LLMService.removeApiKey(index);
    setApiKeys(LLMService.getApiKeys());
    if (LLMService.getApiKeys().length === 0) {
      setApiKey('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            🔑 AI Assistant API Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
              📋 Get Your Free API Key
            </h3>
            <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>1. Visit <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">openrouter.ai/settings/keys</a></li>
              <li>2. Sign up or log in (free account)</li>
              <li>3. Create a new API key</li>
              <li>4. Copy and paste it below</li>
            </ol>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              OpenRouter API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded-md text-sm">
              {errorMessage}
            </div>
          )}

          {/* Success Message */}
          {isValid === true && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-3 py-2 rounded-md text-sm">
              ✅ API key validated successfully! You can now use the AI Assistant.
            </div>
          )}

          {/* Current API Keys */}
          {apiKeys.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Configured API Keys
              </label>
              <div className="space-y-2">
                {apiKeys.map((maskedKey, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-md">
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      {maskedKey}
                    </span>
                    <button
                      onClick={() => handleRemoveKey(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="Remove this API key"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSaveApiKey}
              disabled={isTestingConnection || !apiKey.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md font-medium"
            >
              {isTestingConnection ? '🔄 Testing...' : '💾 Save & Test'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white py-2 px-4 rounded-md font-medium"
            >
              Cancel
            </button>
          </div>

          {/* Additional Info */}
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-xs text-gray-600 dark:text-gray-400">
            <p><strong>🔒 Privacy:</strong> Your API key is stored locally in your browser and never shared.</p>
            <p><strong>💰 Cost:</strong> OpenRouter offers free credits for new users, then pay-per-use pricing.</p>
            <p><strong>🚀 Models:</strong> Access to DeepSeek R1, Qwen 2.5, Gemini 2.0 Flash, and more!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySettings;
