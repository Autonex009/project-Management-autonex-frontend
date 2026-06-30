import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Sparkles, RotateCcw, Minus } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ConfirmationCard from './ConfirmationCard';
import { streamChat, confirmLeave, confirmWFH, cancelLeave } from '../../services/chatApi';

const SUGGESTED_QUESTIONS = [
    { text: "How many leaves do I have?", icon: "📊" },
    { text: "Can I work from home this Friday?", icon: "🏠" },
    { text: "What projects am I working on?", icon: "📁" },
    { text: "When is the next holiday?", icon: "🎉" },
    { text: "Plan 5 days off in August", icon: "🗓️" },
    { text: "What's the leave policy?", icon: "📋" },
];

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [showPulse, setShowPulse] = useState(true);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    // Hide pulse after first open
    useEffect(() => {
        if (isOpen) setShowPulse(false);
    }, [isOpen]);

    const handleSend = useCallback(async (text) => {
        const messageText = text || input.trim();
        if (!messageText || isLoading) return;

        setInput('');
        setPendingAction(null);

        // Add user message
        const userMsg = { id: Date.now(), role: 'user', content: messageText };
        setMessages(prev => [...prev, userMsg]);

        // Add streaming placeholder
        const assistantId = Date.now() + 1;
        setMessages(prev => [...prev, { id: assistantId, role: 'model', content: '', isStreaming: true }]);
        setIsLoading(true);

        let fullContent = '';

        await streamChat(messageText, conversationId, (event) => {
            switch (event.type) {
                case 'token':
                    fullContent += event.content;
                    setMessages(prev =>
                        prev.map(m =>
                            m.id === assistantId
                                ? { ...m, content: fullContent, isStreaming: true }
                                : m
                        )
                    );
                    break;

                case 'tool_call':
                    // Show tool call indicator
                    setMessages(prev => [
                        ...prev.filter(m => m.id !== `tool-${event.tool}`),
                        { id: `tool-${event.tool}`, role: 'tool_call', toolName: event.tool },
                    ]);
                    break;

                case 'tool_result':
                    // Remove tool call indicator
                    setMessages(prev => prev.filter(m => m.id !== `tool-${event.tool}`));
                    break;

                case 'action_confirm':
                    setPendingAction({
                        action: event.action,
                        details: event.details,
                    });
                    break;

                case 'meta':
                    if (event.conversation_id) {
                        setConversationId(event.conversation_id);
                    }
                    break;

                case 'error':
                    setMessages(prev =>
                        prev.map(m =>
                            m.id === assistantId
                                ? { ...m, content: `Something went wrong: ${event.message}`, isStreaming: false }
                                : m
                        )
                    );
                    break;

                case 'done':
                    setMessages(prev =>
                        prev.map(m =>
                            m.id === assistantId
                                ? { ...m, isStreaming: false }
                                : m
                        )
                    );
                    setIsLoading(false);
                    break;
            }
        });

        setIsLoading(false);
    }, [input, isLoading, conversationId]);

    const handleConfirmAction = async () => {
        if (!pendingAction) return;
        setActionLoading(true);

        try {
            let result;
            if (pendingAction.action === 'apply_leave') {
                result = await confirmLeave(pendingAction.details);
            } else if (pendingAction.action === 'apply_wfh') {
                result = await confirmWFH(pendingAction.details);
            } else if (pendingAction.action === 'cancel_leave') {
                result = await cancelLeave(pendingAction.details.leave_id);
            }

            // Add confirmation message
            const confirmMsg = {
                id: Date.now(),
                role: 'model',
                content: result.success
                    ? `✅ ${result.message}`
                    : `❌ ${result.detail || result.message || 'Action failed'}`,
            };
            setMessages(prev => [...prev, confirmMsg]);
            setPendingAction(null);
        } catch (err) {
            const errorMsg = {
                id: Date.now(),
                role: 'model',
                content: `❌ Failed to execute action: ${err.message}`,
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelAction = () => {
        setPendingAction(null);
        const cancelMsg = {
            id: Date.now(),
            role: 'model',
            content: 'Action cancelled. Is there anything else I can help with?',
        };
        setMessages(prev => [...prev, cancelMsg]);
    };

    const handleNewChat = () => {
        setMessages([]);
        setConversationId(null);
        setPendingAction(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Chat Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    id="chat-widget-trigger"
                    className="fixed bottom-6 right-6 z-50 group"
                >
                    <div className="relative">
                        {showPulse && (
                            <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-2xl opacity-30 blur-lg animate-pulse" />
                        )}
                        <div className="relative flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-300/40 hover:shadow-2xl hover:shadow-violet-400/50 transition-all duration-300 hover:scale-105 active:scale-95">
                            <Sparkles className="w-5 h-5" />
                            <span className="font-semibold text-sm">Ask AI</span>
                        </div>
                    </div>
                </button>
            )}

            {/* Chat Panel */}
            {isOpen && (
                <div
                    className="fixed bottom-6 right-6 z-50 flex flex-col w-[420px] h-[600px] max-h-[80vh] rounded-3xl shadow-2xl shadow-slate-400/30 border border-slate-200/80 overflow-hidden"
                    style={{
                        background: 'linear-gradient(180deg, #fafbff 0%, #f8f9fe 40%, #f5f5ff 100%)',
                    }}
                >
                    {/* Header */}
                    <div className="relative flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15),_transparent_70%)]" />
                        <div className="relative flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm tracking-tight">Autonex AI</h3>
                                <p className="text-[11px] text-white/70 font-medium">Your work assistant</p>
                            </div>
                        </div>
                        <div className="relative flex items-center gap-1">
                            <button
                                onClick={handleNewChat}
                                title="New conversation"
                                className="p-2 rounded-xl hover:bg-white/15 transition-colors"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 rounded-xl hover:bg-white/15 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div
                        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#c7c7cc transparent' }}
                    >
                        {messages.length === 0 ? (
                            /* Welcome screen with suggested questions */
                            <div className="flex flex-col items-center justify-center h-full px-2">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-200/60">
                                    <Sparkles className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1">Hi there! 👋</h3>
                                <p className="text-sm text-slate-500 text-center mb-6 max-w-[280px]">
                                    I can help with leaves, WFH, projects, policies, and more.
                                </p>
                                <div className="w-full grid grid-cols-2 gap-2">
                                    {SUGGESTED_QUESTIONS.map((q, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSend(q.text)}
                                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-slate-100 text-left text-xs text-slate-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.97]"
                                        >
                                            <span className="text-base">{q.icon}</span>
                                            <span className="font-medium leading-tight">{q.text}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg) => (
                                    <ChatMessage
                                        key={msg.id}
                                        role={msg.role}
                                        content={msg.content}
                                        isStreaming={msg.isStreaming}
                                        toolName={msg.toolName}
                                    />
                                ))}

                                {/* Confirmation Card */}
                                {pendingAction && (
                                    <ConfirmationCard
                                        action={pendingAction.action}
                                        details={pendingAction.details}
                                        onConfirm={handleConfirmAction}
                                        onCancel={handleCancelAction}
                                        isLoading={actionLoading}
                                    />
                                )}

                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* Input */}
                    <div className="border-t border-slate-100 bg-white/80 backdrop-blur px-4 py-3">
                        <div className="flex items-end gap-2">
                            <div className="flex-1 relative">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask me anything..."
                                    rows={1}
                                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 pr-12 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 focus:bg-white transition-all"
                                    style={{ maxHeight: '120px' }}
                                    onInput={(e) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                    }}
                                />
                            </div>
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || isLoading}
                                className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                                    input.trim() && !isLoading
                                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200/50 hover:shadow-xl hover:scale-105 active:scale-95'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                <Send className="w-4.5 h-4.5" />
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">
                            Powered by Gemini 2.5 Flash • Responses may be inaccurate
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatWidget;
