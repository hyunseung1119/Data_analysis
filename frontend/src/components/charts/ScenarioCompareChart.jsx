import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

/**
 * Scenario Compare Chart - 시나리오 비교 막대 차트
 * 
 * 예: 법인전환 vs 개인사업 세금 비교
 */
function ScenarioCompareChart({ scenarios = [], title = "시나리오 비교" }) {
    // 샘플 데이터 (실제로는 에이전트 응답에서 추출)
    const defaultData = [
        { name: '개인사업 유지', 종합소득세: 3500, 건강보험: 400, 국민연금: 200, total: 4100 },
        { name: '법인 전환', 법인세: 1200, 급여소득세: 1500, 배당세: 500, 건보료: 300, total: 3500 },
    ];

    const data = scenarios.length > 0 ? scenarios : defaultData;

    // 각 세금 항목의 색상
    const colors = {
        종합소득세: '#f59e0b',
        건강보험: '#3b82f6',
        국민연금: '#10b981',
        법인세: '#8b5cf6',
        급여소득세: '#ec4899',
        배당세: '#6366f1',
        건보료: '#14b8a6',
    };

    // 모든 항목 키 추출 (name, total 제외)
    const allKeys = [...new Set(data.flatMap(d => Object.keys(d).filter(k => k !== 'name' && k !== 'total')))];

    // 최적 시나리오 찾기
    const minTotal = Math.min(...data.map(d => d.total));
    const bestScenario = data.find(d => d.total === minTotal);
    const savings = data.length > 1 ? Math.max(...data.map(d => d.total)) - minTotal : 0;

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                📊 {title}
            </h4>

            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data} layout="vertical">
                    <XAxis
                        type="number"
                        tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                    />
                    <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fill: '#e5e7eb', fontSize: 12 }}
                        width={90}
                    />
                    <Tooltip
                        contentStyle={{
                            background: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px'
                        }}
                        formatter={(value) => [`${value.toLocaleString()}만원`, '']}
                        labelStyle={{ color: '#fff' }}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: '11px' }}
                        formatter={(value) => <span style={{ color: '#e5e7eb' }}>{value}</span>}
                    />
                    {allKeys.map((key) => (
                        <Bar
                            key={key}
                            dataKey={key}
                            stackId="a"
                            fill={colors[key] || '#6b7280'}
                            radius={[0, 0, 0, 0]}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>

            {/* 인사이트 */}
            {savings > 0 && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                        <span className="text-green-400 text-lg">💡</span>
                        <div>
                            <div className="text-sm text-green-400 font-medium">
                                {bestScenario?.name} 추천
                            </div>
                            <div className="text-xs text-gray-400">
                                연간 약 {savings.toLocaleString()}만원 절세 효과
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ScenarioCompareChart;
