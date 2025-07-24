import React, { useState, useRef, useEffect } from 'react';

interface Message {
    text: string;
    sender: 'user' | 'bot';
}

interface ChatPanelProps {
    onSendMessage: (message: string) => void;
    messages: Message[];
    isProcessing: boolean;
}

const UserIcon = () => (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);

const BotIcon = () => (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
);

const ChatPanel: React.FC<ChatPanelProps> = ({ onSendMessage, messages, isProcessing }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages, isProcessing]);

    const handleSend = () => {
        if (input.trim()) {
            onSendMessage(input.trim());
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
            <h4 className="text-lg font-semibold p-4 bg-gray-900 rounded-t-lg">AI Assistant</h4>
            
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
                             <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
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

            <div className="p-4 bg-gray-900 rounded-b-lg border-t border-gray-700">
                <div className="flex items-center bg-gray-700 rounded-lg">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-grow bg-transparent p-2 text-white placeholder-gray-400 focus:outline-none"
                        placeholder="Plot NDVI vs Date..."
                        disabled={isProcessing}
                    />
                    <button onClick={handleSend} className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 disabled:bg-gray-500 transition-colors duration-200" disabled={isProcessing}>
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatPanel;