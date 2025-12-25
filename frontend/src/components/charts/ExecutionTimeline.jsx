/**
 * Execution Timeline - 에이전트 실행 타임라인
 */
function ExecutionTimeline({ agentSteps = [] }) {
    if (agentSteps.length === 0) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-white mb-4">⏱️ 실행 타임라인</h4>
                <div className="text-gray-400 text-sm text-center py-4">
                    질문을 입력하면 실행 타임라인이 표시됩니다.
                </div>
            </div>
        );
    }

    const totalDuration = agentSteps.reduce((sum, s) => sum + (s.duration_ms || 0), 0);

    const agentConfig = {
        law_expert: { emoji: '📜', color: '#10b981', label: '법령 전문가' },
        calculator: { emoji: '🧮', color: '#3b82f6', label: '계산 전문가' },
        risk_analyst: { emoji: '⚠️', color: '#f59e0b', label: '리스크 분석' },
        strategist: { emoji: '🎯', color: '#ec4899', label: '전략가' },
    };

    let cumulativeTime = 0;

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center justify-between">
                <span>⏱️ 실행 타임라인</span>
                <span className="text-xs text-gray-400 font-normal">
                    총 {totalDuration}ms
                </span>
            </h4>

            <div className="space-y-3">
                {agentSteps.map((step, idx) => {
                    const config = agentConfig[step.agent_name] || {
                        emoji: '🤖',
                        color: '#6b7280',
                        label: step.agent_name
                    };
                    const startTime = cumulativeTime;
                    cumulativeTime += step.duration_ms || 0;
                    const widthPercent = totalDuration > 0
                        ? ((step.duration_ms || 0) / totalDuration) * 100
                        : 0;

                    return (
                        <div key={idx} className="relative">
                            {/* Connection line */}
                            {idx > 0 && (
                                <div className="absolute left-4 -top-3 w-0.5 h-3 bg-gray-700" />
                            )}

                            <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                                    style={{ background: `${config.color}20`, border: `1px solid ${config.color}50` }}
                                >
                                    {config.emoji}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-white font-medium">{config.label}</span>
                                        <span className="text-xs text-gray-400">{step.duration_ms}ms</span>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-1.5 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${widthPercent}%`,
                                                background: config.color,
                                            }}
                                        />
                                    </div>

                                    {/* Confidence */}
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="text-xs text-gray-500">
                                            신뢰도: {Math.round((step.confidence || 0) * 100)}%
                                        </span>
                                        <span className="text-xs text-gray-600">|</span>
                                        <span className="text-xs text-gray-500">
                                            {startTime}ms ~ {cumulativeTime}ms
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ExecutionTimeline;
