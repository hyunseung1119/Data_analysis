import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChatStore } from '../stores/chatStore';
import AgentCard from '../components/AgentCard';
import { AgentChartsPanel } from '../components/AgentCharts';

function ChatPage() {
    const [input, setInput] = useState('');
    const { messages, isLoading, agentSteps, sendMessage } = useChatStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const query = input.trim();
        setInput('');
        await sendMessage(query);
    };

    const exampleQueries = [
        "법인전환 vs 개인사업 유지, 뭐가 더 유리할까요?",
        "종합소득세 절세 방법 알려주세요",
        "세무조사 리스크가 높은 항목이 뭐가 있나요?",
    ];

    return (
        <div className="flex h-[calc(100vh-80px)]">
            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center mb-6">
                                <span className="text-4xl">🤖</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                Multi-Agent 의사결정 시스템
                            </h2>
                            <p className="text-gray-400 mb-8 max-w-md">
                                복잡한 세무/금융 질문에 대해 여러 전문가 AI가 협업하여
                                종합적인 의사결정을 도와드립니다.
                            </p>

                            {/* Example queries */}
                            <div className="space-y-2">
                                <p className="text-sm text-gray-500 mb-3">예시 질문:</p>
                                {exampleQueries.map((query, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setInput(query)}
                                        className="block w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors"
                                    >
                                        💡 {query}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-3xl rounded-2xl px-5 py-4 ${msg.role === 'user'
                                        ? 'bg-primary-600 text-white'
                                        : msg.isError
                                            ? 'bg-red-500/20 border border-red-500/30'
                                            : 'bg-white/10 backdrop-blur-sm'
                                        }`}
                                >
                                    {msg.role === 'assistant' ? (
                                        <div className="markdown">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            {msg.confidence !== undefined && (
                                                <div className="mt-4 pt-4 border-t border-white/10">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="text-gray-400">신뢰도:</span>
                                                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                                                                style={{ width: `${msg.confidence * 100}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-white font-medium">
                                                            {Math.round(msg.confidence * 100)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p>{msg.content}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}

                    {/* Loading indicator */}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin-slow w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
                                    <span className="text-gray-300">에이전트들이 분석 중입니다...</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/10">
                    <form onSubmit={handleSubmit} className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="질문을 입력하세요..."
                            disabled={isLoading}
                            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        >
                            전송
                        </button>
                    </form>
                </div>
            </div>

            {/* Agent Panel with Charts */}
            <div className="w-80 border-l border-white/10 p-4 overflow-y-auto">
                {/* Agent Status */}
                <h3 className="text-sm font-semibold text-gray-400 mb-4">🤖 에이전트 상태</h3>
                <div className="space-y-3 mb-6">
                    {['law_expert', 'calculator', 'risk_analyst', 'strategist'].map((name) => {
                        const step = agentSteps.find(s => s.agent_name === name);
                        return (
                            <AgentCard
                                key={name}
                                name={name}
                                status={isLoading && !step ? 'waiting' : step ? 'completed' : 'idle'}
                                confidence={step?.confidence}
                                duration={step?.duration_ms}
                            />
                        );
                    })}
                </div>

                {/* Agent Charts */}
                <h3 className="text-sm font-semibold text-gray-400 mb-4">📈 분석 차트</h3>
                <AgentChartsPanel agentSteps={agentSteps} />
            </div>
        </div>
    );
}

export default ChatPage;

