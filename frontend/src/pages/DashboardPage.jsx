import { useEffect, useState } from 'react';
import api from '../services/api';

function DashboardPage() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAgents();
    }, []);

    const loadAgents = async () => {
        try {
            const data = await api.listAgents();
            setAgents(data.agents || []);
        } catch (error) {
            console.error('Failed to load agents:', error);
        } finally {
            setLoading(false);
        }
    };

    const agentConfig = {
        law_expert: { emoji: '📜', color: 'bg-emerald-500', label: '법령 전문가' },
        calculator: { emoji: '🧮', color: 'bg-blue-500', label: '계산 전문가' },
        risk_analyst: { emoji: '⚠️', color: 'bg-amber-500', label: '리스크 분석가' },
        strategist: { emoji: '🎯', color: 'bg-purple-500', label: '전략가' },
    };

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">에이전트 대시보드</h1>
                <p className="text-gray-400">시스템에 등록된 AI 에이전트 현황</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin-slow w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {agents.map((agent) => {
                        const config = agentConfig[agent.name] || {
                            emoji: '🤖',
                            color: 'bg-gray-500',
                            label: agent.name
                        };

                        return (
                            <div
                                key={agent.name}
                                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`w-12 h-12 ${config.color} rounded-xl flex items-center justify-center text-2xl`}>
                                        {config.emoji}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">{config.label}</h3>
                                        <p className="text-xs text-gray-400">{agent.name}</p>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-300 mb-4">
                                    {agent.description || '설명 없음'}
                                </p>

                                <div className="flex items-center justify-between">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${agent.is_available
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${agent.is_available ? 'bg-green-400' : 'bg-red-400'
                                            }`} />
                                        {agent.is_available ? '활성' : '비활성'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* System Info */}
            <div className="mt-12 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">시스템 정보</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-gray-400 text-sm">총 에이전트</p>
                        <p className="text-2xl font-bold text-white">{agents.length}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">활성 에이전트</p>
                        <p className="text-2xl font-bold text-green-400">
                            {agents.filter(a => a.is_available).length}
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">API 버전</p>
                        <p className="text-2xl font-bold text-white">v1.0</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">상태</p>
                        <p className="text-2xl font-bold text-green-400">정상</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DashboardPage;
