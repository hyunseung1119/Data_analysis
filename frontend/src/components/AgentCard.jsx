const agentConfig = {
    law_expert: {
        emoji: '📜',
        color: 'bg-emerald-500',
        label: '법령 전문가',
        description: '법령 검색 및 해석',
    },
    calculator: {
        emoji: '🧮',
        color: 'bg-blue-500',
        label: '계산 전문가',
        description: '세금 계산 및 시뮬레이션',
    },
    risk_analyst: {
        emoji: '⚠️',
        color: 'bg-amber-500',
        label: '리스크 분석가',
        description: '세무 리스크 평가',
    },
    strategist: {
        emoji: '🎯',
        color: 'bg-purple-500',
        label: '전략가',
        description: '종합 전략 수립',
    },
};

function AgentCard({ name, status, confidence, duration }) {
    const config = agentConfig[name] || {
        emoji: '🤖',
        color: 'bg-gray-500',
        label: name,
        description: '',
    };

    const statusConfig = {
        idle: { label: '대기', class: 'text-gray-400' },
        waiting: { label: '대기 중', class: 'text-yellow-400 animate-pulse-slow' },
        running: { label: '실행 중', class: 'text-blue-400 animate-pulse' },
        completed: { label: '완료', class: 'text-green-400' },
        error: { label: '오류', class: 'text-red-400' },
    };

    const currentStatus = statusConfig[status] || statusConfig.idle;

    return (
        <div className={`bg-white/5 border border-white/10 rounded-xl p-3 transition-all ${status === 'running' ? 'ring-2 ring-blue-500/50' : ''
            }`}>
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 ${config.color} rounded-lg flex items-center justify-center text-sm`}>
                    {config.emoji}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{config.label}</p>
                    <p className={`text-xs ${currentStatus.class}`}>
                        {status === 'running' && (
                            <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-1" />
                        )}
                        {currentStatus.label}
                    </p>
                </div>
            </div>

            {status === 'completed' && confidence !== undefined && (
                <div className="mt-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">신뢰도</span>
                        <span className="text-white font-medium">{Math.round(confidence * 100)}%</span>
                    </div>
                    {duration && (
                        <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-gray-400">소요시간</span>
                            <span className="text-gray-300">{duration}ms</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AgentCard;
