import React, { useState, useRef, useEffect } from 'react';
<<<<<<< Updated upstream
=======
import { ApiService, OpenRouterModel, GeminiModel } from '../types';
>>>>>>> Stashed changes

interface Message {
    text: string;
    sender: 'user' | 'bot';
}

interface ChatPanelProps {
<<<<<<< Updated upstream
    onSendMessage: (message: string) => void;
    messages: Message[];
    isProcessing: boolean;
=======
    onSendMessage: (message: string, service: ApiService) => void;
    messages: Message[];
    isProcessing: boolean;
    apiService: ApiService;
    setApiService: (service: ApiService) => void;
    selectedModel: string; // Changed to string
    setSelectedModel: (model: string) => void; // Changed to string
>>>>>>> Stashed changes
}

const UserIcon = () => (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);

const BotIcon = () => (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
);

<<<<<<< Updated upstream
const ChatPanel: React.FC<ChatPanelProps> = ({ onSendMessage, messages, isProcessing }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        scrollToBottom();
=======
const ChatPanel: React.FC<ChatPanelProps> = ({ onSendMessage, messages, isProcessing, apiService, setApiService, selectedModel, setSelectedModel }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
        if (!isProcessing) {
            inputRef.current?.focus();
        }
>>>>>>> Stashed changes
    }, [messages, isProcessing]);

    const handleSend = () => {
        if (input.trim()) {
<<<<<<< Updated upstream
            onSendMessage(input.trim());
=======
            onSendMessage(input.trim(), apiService);
>>>>>>> Stashed changes
            setInput('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !isProcessing) {
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-800 rounded-lg shadow-2xl text-white">
<<<<<<< Updated upstream
            <h4 className="text-lg font-semibold p-4 bg-gray-900 rounded-t-lg">AI Assistant</h4>
=======
            <h4 className="text-lg font-semibold p-4 bg-gray-900 rounded-t-lg flex-shrink-0">AI Assistant</h4>
>>>>>>> Stashed changes
            
            <div className="flex-grow p-4 overflow-y-auto min-h-[200px] max-h-[400px]">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-end gap-2 mb-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'bot' && (
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                                <BotIcon />
                            </div>
                        )}
                        <div className={`rounded-lg px-4 py-2 max-w-xs text-sm shadow-md ${msg.sender === 'user' ? 'bg-blue-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>
                            {msg.text}
                        </div>
                        {msg.sender === 'user' && (
<<<<<<< Updated upstream
                             <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
=======
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
>>>>>>> Stashed changes
                                <UserIcon />
                            </div>
                        )}
                    </div>
                ))}
                {isProcessing && (
                    <div className="flex items-end gap-2 mb-4 justify-start">
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                            <BotIcon />
                        </div>
                        <div className="rounded-lg px-4 py-2 max-w-xs text-sm bg-gray-700 rounded-bl-none shadow-md">
                            <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-150"></div>
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-300"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

<<<<<<< Updated upstream
            <div className="p-4 bg-gray-900 rounded-b-lg border-t border-gray-700">
                <div className="flex items-center bg-gray-700 rounded-lg">
                    <input
=======
            {/* Integrated Input Area */}
            <div className="p-4 border-t border-gray-700 flex-shrink-0">
                <div className="flex items-center bg-gray-700 rounded-lg mb-2">
                    <input
                        ref={inputRef}
>>>>>>> Stashed changes
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-grow bg-transparent p-2 text-white placeholder-gray-400 focus:outline-none"
<<<<<<< Updated upstream
                        placeholder="Plot NDVI vs Date..."
=======
                        placeholder="Plot NDVI vs Date, or change line color to blue..."
>>>>>>> Stashed changes
                        disabled={isProcessing}
                    />
                    <button onClick={handleSend} className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 disabled:bg-gray-500 transition-colors duration-200" disabled={isProcessing}>
                        Send
                    </button>
                </div>
<<<<<<< Updated upstream
=======
                <div className="flex flex-wrap items-center justify-end text-xs text-gray-400 mt-2 gap-2">
                    <label htmlFor="api-service-select" className="mr-2">AI Provider:</label>
                    <select 
                        id="api-service-select"
                        value={apiService}
                        onChange={e => setApiService(e.target.value as ApiService)}
                        className="bg-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value={ApiService.OPENROUTER}>OpenRouter</option>
                        <option value={ApiService.GEMINI}>Gemini</option>
                    </select>
                    {apiService === ApiService.OPENROUTER && (
                        <>
                            <label htmlFor="openrouter-model-select" className="ml-4 mr-2">Model:</label>
                            <select
                                id="openrouter-model-select"
                                value={selectedModel}
                                onChange={e => setSelectedModel(e.target.value)}
                                className="bg-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {Object.values(OpenRouterModel).map(model => (
                                    <option key={model} value={model}>{model}</option>
                                ))}
                            </select>
                        </>
                    )}
                    {apiService === ApiService.GEMINI && (
                        <>
                            <label htmlFor="gemini-model-select" className="ml-4 mr-2">Model:</label>
                            <select
                                id="gemini-model-select"
                                value={selectedModel}
                                onChange={e => setSelectedModel(e.target.value)}
                                className="bg-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {Object.values(GeminiModel).map(model => (
                                    <option key={model} value={model}>{model}</option>
                                ))}
                            </select>
                        </>
                    )}
                </div>
>>>>>>> Stashed changes
            </div>
        </div>
    );
};

export default ChatPanel;