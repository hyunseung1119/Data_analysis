import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
    // State
    messages: [],
    isLoading: false,
    currentSessionId: null,
    agentSteps: [],
    executionOrder: [],
    visualizations: [],
    error: null,

    // Actions
    addMessage: (message) => set((state) => ({
        messages: [...state.messages, message],
    })),

    setLoading: (loading) => set({ isLoading: loading }),

    setSessionId: (sessionId) => set({ currentSessionId: sessionId }),

    setAgentSteps: (steps) => set({ agentSteps: steps }),

    setExecutionOrder: (order) => set({ executionOrder: order }),

    setVisualizations: (visualizations) => set({ visualizations }),

    setError: (error) => set({ error }),

    clearMessages: () => set({ messages: [], agentSteps: [], visualizations: [], executionOrder: [] }),

    // Send message and get response
    sendMessage: async (query) => {
        const { addMessage, setLoading, setAgentSteps, setSessionId, setError, setExecutionOrder, setVisualizations, currentSessionId } = get();

        // Add user message
        addMessage({
            role: 'user',
            content: query,
            timestamp: new Date().toISOString(),
        });

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    session_id: currentSessionId,
                }),
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();

            // Set session ID
            if (data.session_id) {
                setSessionId(data.session_id);
            }

            // Set agent steps
            if (data.agent_steps) {
                setAgentSteps(data.agent_steps);
            }

            // Set execution order
            if (data.execution_order) {
                setExecutionOrder(data.execution_order);
            }

            // Set visualizations
            if (data.visualizations) {
                setVisualizations(data.visualizations);
            }

            // Add assistant message
            addMessage({
                role: 'assistant',
                content: data.answer,
                confidence: data.confidence,
                agentSteps: data.agent_steps,
                visualizations: data.visualizations,
                timestamp: new Date().toISOString(),
            });

        } catch (error) {
            setError(error.message);
            addMessage({
                role: 'assistant',
                content: `오류가 발생했습니다: ${error.message}`,
                isError: true,
                timestamp: new Date().toISOString(),
            });
        } finally {
            setLoading(false);
        }
    },
}));

export default useChatStore;

