import { ResponsiveHeatMap } from '@nivo/heatmap';

/**
 * Risk Heatmap - 리스크 히트맵 시각화
 * 
 * X축: 발생 가능성 (낮음, 중간, 높음)
 * Y축: 영향도 (낮음, 중간, 높음)
 */
function RiskHeatmap({ risks = [] }) {
    // 샘플 데이터 (실제로는 RiskAnalyst 에이전트 응답에서 추출)
    const defaultRisks = [
        { id: '매출누락', probability: '높음', impact: '높음', score: 9 },
        { id: '비용과다계상', probability: '높음', impact: '중간', score: 6 },
        { id: '세금계산서 미수취', probability: '높음', impact: '낮음', score: 3 },
        { id: '가지급금 미정산', probability: '중간', impact: '중간', score: 4 },
        { id: '증빙 미비', probability: '중간', impact: '낮음', score: 2 },
    ];

    const riskData = risks.length > 0 ? risks : defaultRisks;

    // 히트맵 데이터 변환
    const probabilityLevels = ['낮음', '중간', '높음'];
    const impactLevels = ['낮음', '중간', '높음'];

    const heatmapData = impactLevels.map(impact => ({
        id: impact,
        data: probabilityLevels.map(prob => {
            const matchingRisks = riskData.filter(
                r => r.probability === prob && r.impact === impact
            );
            return {
                x: prob,
                y: matchingRisks.length > 0 ? matchingRisks[0].score : 0,
                risks: matchingRisks.map(r => r.id),
            };
        }),
    })).reverse();

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                ⚠️ 리스크 히트맵
            </h4>

            <div className="h-[200px]">
                <ResponsiveHeatMap
                    data={heatmapData}
                    margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
                    axisTop={null}
                    axisBottom={{
                        tickSize: 0,
                        tickPadding: 8,
                        legend: '발생 가능성',
                        legendPosition: 'middle',
                        legendOffset: 32,
                    }}
                    axisLeft={{
                        tickSize: 0,
                        tickPadding: 8,
                        legend: '영향도',
                        legendPosition: 'middle',
                        legendOffset: -40,
                    }}
                    colors={{
                        type: 'sequential',
                        scheme: 'reds',
                    }}
                    emptyColor="#1f2937"
                    borderRadius={4}
                    borderWidth={1}
                    borderColor="#374151"
                    theme={{
                        text: { fill: '#9ca3af' },
                        axis: {
                            legend: { text: { fill: '#9ca3af', fontSize: 11 } },
                            ticks: { text: { fill: '#e5e7eb', fontSize: 10 } },
                        },
                    }}
                    labelTextColor="#fff"
                    legends={[]}
                    annotations={[]}
                    hoverTarget="cell"
                    tooltip={({ cell }) => (
                        <div className="bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
                            <div className="text-white text-sm font-medium">
                                영향도: {cell.serieId} / 가능성: {cell.data.x}
                            </div>
                            {cell.data.risks && cell.data.risks.length > 0 && (
                                <div className="text-gray-400 text-xs mt-1">
                                    위험 항목: {cell.data.risks.join(', ')}
                                </div>
                            )}
                        </div>
                    )}
                />
            </div>

            {/* 주요 리스크 목록 */}
            <div className="mt-4 space-y-2">
                <div className="text-xs text-gray-400 mb-2">주요 리스크 항목:</div>
                {riskData.slice(0, 5).map((risk, idx) => (
                    <div
                        key={idx}
                        className="flex items-center justify-between text-xs px-2 py-1 rounded bg-gray-800/50"
                    >
                        <span className="text-gray-300">{risk.id}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${risk.score >= 6 ? 'bg-red-500/20 text-red-400' :
                                risk.score >= 3 ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-green-500/20 text-green-400'
                            }`}>
                            {risk.probability} / {risk.impact}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default RiskHeatmap;
