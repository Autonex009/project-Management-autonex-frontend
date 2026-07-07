/**
 * Chat API service — handles SSE streaming and action confirmation calls.
 */

// Base URL - matches the pattern in api.js
let apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
if (!apiBaseUrl.includes('localhost') && apiBaseUrl.startsWith('http://')) {
    apiBaseUrl = apiBaseUrl.replace('http://', 'https://');
}

/**
 * Send a chat message and receive streaming SSE events.
 * @param {string} message - The user's message
 * @param {string|null} conversationId - Existing conversation ID or null for new
 * @param {function} onEvent - Callback for each SSE event: { type, content?, tool?, data?, action?, details? }
 * @returns {Promise<void>}
 */
export async function streamChat(message, conversationId, onEvent) {
    const token = localStorage.getItem('token');
    if (!token) {
        onEvent({ type: 'error', message: 'Not authenticated' });
        return;
    }

    const response = await fetch(`${apiBaseUrl}/chat/stream`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            message,
            conversation_id: conversationId,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        onEvent({ type: 'error', message: `Request failed: ${response.status} ${errorText}` });
        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
                try {
                    const data = JSON.parse(trimmed.slice(6));
                    onEvent(data);
                } catch {
                    // Skip malformed events
                }
            }
        }
    }
}

/**
 * Confirm a leave application.
 */
export async function confirmLeave(details) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiBaseUrl}/chat/confirm-leave`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(details),
    });
    return response.json();
}

/**
 * Confirm a WFH application.
 */
export async function confirmWFH(details) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiBaseUrl}/chat/confirm-wfh`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(details),
    });
    return response.json();
}

/**
 * Confirm a leave cancellation.
 */
export async function cancelLeave(leaveId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiBaseUrl}/chat/cancel-leave`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ leave_id: leaveId }),
    });
    return response.json();
}

/**
 * Get conversation history.
 */
export async function getChatHistory(conversationId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiBaseUrl}/chat/history/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    return response.json();
}

/**
 * List user conversations.
 */
export async function getConversations() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiBaseUrl}/chat/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    return response.json();
}
