import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Wrench } from 'lucide-react';
import './ChatMarkdown.css';

/**
 * ChatMessage — renders a single message bubble (user or assistant).
 * Bot messages use react-markdown for full markdown rendering.
 */
const ChatMessage = ({ role, content, isStreaming, toolName }) => {
    const isUser = role === 'user';
    const isToolCall = role === 'tool_call';

    if (isToolCall) {
        return (
            <div className="flex items-center gap-2 py-1.5 px-3 my-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 rounded-full px-3 py-1.5 border border-slate-100">
                    <Wrench className="w-3 h-3 animate-spin" />
                    <span>Looking up {formatToolName(toolName)}...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex gap-2.5 py-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {/* Bot Avatar */}
            {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-200/50">
                    <Bot className="w-4 h-4 text-white" />
                </div>
            )}

            {/* Message bubble */}
            <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                        ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-br-md shadow-lg shadow-slate-300/30'
                        : 'bg-white text-slate-700 border border-slate-100 rounded-bl-md shadow-sm'
                }`}
            >
                {content ? (
                    isUser ? (
                        <div className="whitespace-pre-wrap">{content}</div>
                    ) : (
                        <div className="chat-markdown">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {content}
                            </ReactMarkdown>
                        </div>
                    )
                ) : isStreaming ? (
                    <div className="flex items-center gap-1.5">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                ) : null}
            </div>

            {/* User Avatar */}
            {isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shadow-md shadow-slate-300/30">
                    <User className="w-4 h-4 text-white" />
                </div>
            )}
        </div>
    );
};

function formatToolName(name) {
    if (!name) return 'data';
    const names = {
        get_leave_balance: 'leave balance',
        get_my_leaves: 'leave history',
        get_wfh_usage: 'WFH usage',
        get_my_projects: 'projects',
        get_holidays: 'holidays',
        plan_leave: 'leave plan',
        search_policy: 'policies',
        apply_leave: 'leave application',
        apply_wfh: 'WFH application',
        cancel_leave: 'leave cancellation',
    };
    return names[name] || name.replace(/_/g, ' ');
}

export default ChatMessage;
