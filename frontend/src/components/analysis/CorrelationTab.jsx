// 상관관계 탭 컴포넌트
function CorrelationTab({ correlation }) {
    if (!correlation) {
        return (
            <div className="text-center py-12 text-gray-400">
                상관관계 분석을 위해 최소 2개의 수치형 컬럼이 필요합니다.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {correlation.insight && (
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">💡</span>
                        <span className="text-indigo-300">{correlation.insight}</span>
                    </div>
                </div>
            )}

            {correlation.strong_correlations.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h4 className="text-white font-medium mb-3">강한 상관관계 (|r| &gt; 0.7)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {correlation.strong_correlations.map((c, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                                <span className="text-gray-300">{c.pair[0]} ↔ {c.pair[1]}</span>
                                <span className={`font-mono font-bold ${c.correlation > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    r = {c.correlation} {c.correlation > 0 ? '⬆️' : '⬇️'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CorrelationTab;
