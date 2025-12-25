import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const COLORS = {
    law_expert: '#10b981',
    calculator: '#3b82f6',
    risk_analyst: '#f59e0b',
    strategist: '#8b5cf6',
};

const AGENT_LABELS = {
    law_expert: '법령전문가',
    calculator: '계산전문가',
    risk_analyst: '리스크분석',
    strategist: '전략가',
};

/**
 * 에이전트 신뢰도 바 차트
 */
export function ConfidenceBarChart({ agentSteps }) {
    if (!agentSteps || agentSteps.length === 0) return null;

    const data = agentSteps.map(step => ({
        name: AGENT_LABELS[step.agent_name] || step.agent_name,
        confidence: Math.round(step.confidence * 100),
        fill: COLORS[step.agent_name] || '#6b7280',
    }));

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-white mb-3">📊 에이전트 신뢰도</h4>
            <ResponsiveContainer width="100%" height={150}>
                <BarChart data={data} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#e5e7eb', fontSize: 11 }} width={70} />
                    <Tooltip
                        contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value) => [`${value}%`, '신뢰도']}
                    />
                    <Bar dataKey="confidence" radius={[0, 4, 4, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/**
 * 에이전트 실행 시간 파이 차트
 */
export function DurationPieChart({ agentSteps }) {
    if (!agentSteps || agentSteps.length === 0) return null;

    const data = agentSteps.map(step => ({
        name: AGENT_LABELS[step.agent_name] || step.agent_name,
        value: step.duration_ms || 0,
        fill: COLORS[step.agent_name] || '#6b7280',
    }));

    const totalDuration = data.reduce((sum, d) => sum + d.value, 0);

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-white mb-3">⏱️ 실행 시간 분포</h4>
            <div className="flex items-center">
                <ResponsiveContainer width="50%" height={120}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={45}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={index} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                            formatter={(value) => [`${value}ms`, '소요시간']}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1">
                    {data.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ background: item.fill }} />
                                <span className="text-gray-300">{item.name}</span>
                            </div>
                            <span className="text-gray-400">{item.value}ms</span>
                        </div>
                    ))}
                    <div className="pt-1 border-t border-white/10 flex justify-between text-xs">
                        <span className="text-gray-400">총 소요</span>
                        <span className="text-white font-medium">{totalDuration}ms</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * 에이전트 종합 성능 레이더 차트
 */
export function PerformanceRadarChart({ agentSteps }) {
    if (!agentSteps || agentSteps.length === 0) return null;

    // 성능 지표 계산 (신뢰도, 속도 점수)
    const maxDuration = Math.max(...agentSteps.map(s => s.duration_ms || 1000));

    const data = agentSteps.map(step => ({
        agent: AGENT_LABELS[step.agent_name] || step.agent_name,
        신뢰도: Math.round(step.confidence * 100),
        속도: Math.round((1 - (step.duration_ms || 0) / maxDuration) * 100),
    }));

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-white mb-3">🎯 성능 레이더</h4>
            <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={data}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="agent" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <Radar name="신뢰도" dataKey="신뢰도" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                    <Radar name="속도" dataKey="속도" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Tooltip
                        contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    />
                </RadarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs">
                    <span className="w-3 h-0.5 bg-emerald-500" />
                    <span className="text-gray-400">신뢰도</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                    <span className="w-3 h-0.5 bg-blue-500" />
                    <span className="text-gray-400">속도</span>
                </div>
            </div>
        </div>
    );
}

/**
 * 차트 패널 (모든 차트 포함)
 */
export function AgentChartsPanel({ agentSteps }) {
    if (!agentSteps || agentSteps.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400 text-sm">
                질문을 입력하면 에이전트 분석 차트가 표시됩니다.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <ConfidenceBarChart agentSteps={agentSteps} />
            <DurationPieChart agentSteps={agentSteps} />
            <PerformanceRadarChart agentSteps={agentSteps} />
        </div>
    );
}

export default AgentChartsPanel;
