import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Wrench } from 'lucide-react';

/**
 * ChatMessage — renders a single message bubble (user or assistant).
 * Uses react-markdown for full markdown rendering of AI responses.
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
            {/* Avatar */}
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
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={markdownComponents}
                            >
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

            {/* User avatar */}
            {isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shadow-md shadow-slate-300/30">
                    <User className="w-4 h-4 text-white" />
                </div>
            )}
        </div>
    );
};

/**
 * Custom markdown component renderers for chat styling.
 */
const markdownComponents = {
    // Headings
    h1: ({ children }) => <h3 className="text-base font-bold text-slate-900 mt-3 mb-1.5">{children}</h3>,
    h2: ({ children }) => <h3 className="text-base font-bold text-slate-900 mt-3 mb-1.5">{children}</h3>,
    h3: ({ children }) => <h4 className="text-sm font-semibold text-slate-800 mt-2.5 mb-1">{children}</h4>,
    h4: ({ children }) => <h5 className="text-sm font-semibold text-slate-700 mt-2 mb-1">{children}</h5>,

    // Paragraphs
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,

    // Bold / Italic
    strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
    em: ({ children }) => <em className="italic text-slate-600">{children}</em>,

    // Lists
    ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2 ml-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-2 ml-1">{children}</ol>,
    li: ({ children }) => <li className="text-slate-700">{children}</li>,

    // Tables
    table: ({ children }) => (
        <div className="overflow-x-auto my-2 rounded-lg border border-slate-200">
            <table className="min-w-full text-xs">{children}</table>
        </div>
    ),
    thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
    th: ({ children }) => <th className="px-3 py-1.5 text-left font-semibold text-slate-700 border-b border-slate-200">{children}</th>,
    td: ({ children }) => <td className="px-3 py-1.5 text-slate-600 border-b border-slate-100">{children}</td>,
    tr: ({ children }) => <tr className="hover:bg-slate-50/50">{children}</tr>,

    // Code
    code: ({ inline, children }) =>
        inline !== false ? (
            <code className="bg-slate-100 text-violet-700 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
        ) : (
            <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono">
                <code>{children}</code>
            </pre>
        ),

    // Blockquote
    blockquote: ({ children }) => (
        <blockquote className="border-l-3 border-violet-300 bg-violet-50/50 pl-3 py-1 my-2 text-slate-600 italic rounded-r-lg">
            {children}
        </blockquote>
    ),

    // Horizontal rule
    hr: () => <hr className="my-3 border-slate-200" />,

    // Links
    a: ({ href, children }) => (
        <a href={href} className="text-violet-600 hover:text-violet-800 underline underline-offset-2" target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    ),
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
