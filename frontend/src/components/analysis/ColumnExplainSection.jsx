import { useState } from 'react';

function ColumnExplainSection({ fileId }) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const analyzeColumns = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/analysis/column-explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_id: fileId }),
            });
            if (!res.ok) throw new Error('분석 실패');
            setResult(await res.json());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const getFeatureTypeColor = (type) => {
        const colors = {
            numeric: 'bg-blue-500/20 text-blue-300',
            categorical: 'bg-purple-500/20 text-purple-300',
            datetime: 'bg-green-500/20 text-green-300',
            text: 'bg-orange-500/20 text-orange-300',
            id: 'bg-gray-500/20 text-gray-300',
            binary: 'bg-pink-500/20 text-pink-300',
            ordinal: 'bg-cyan-500/20 text-cyan-300',
        };
        return colors[type] || 'bg-gray-500/20 text-gray-300';
    };

    const getFeatureTypeLabel = (type) => {
        const labels = {
            numeric: '수치형',
            categorical: '범주형',
            datetime: '날짜/시간',
            text: '텍스트',
            id: '식별자',
            binary: '이진형',
            ordinal: '서열형',
        };
        return labels[type] || type;
    };

    return (
        <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">🔬 AI 컬럼 분석</h3>
                    <p className="text-gray-300 text-sm">각 컬럼(Feature)이 무엇을 의미하는지 AI가 분석합니다.</p>
                </div>
                <button
                    onClick={analyzeColumns}
                    disabled={loading}
                    className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg text-white font-bold transition-all flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            분석 중...
                        </>
                    ) : '🔍 컬럼 분석'}
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                    ❌ {error}
                </div>
            )}

            {result?.success && (
                <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <span>총 {result.total_columns}개 컬럼 중 {result.analyzed_columns}개 분석</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {result.columns.map((col, i) => (
                            <div key={i} className="bg-black/30 border border-white/10 rounded-lg p-4 hover:border-cyan-500/30 transition-all">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-cyan-300 font-medium">{col.column}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getFeatureTypeColor(col.feature_type)}`}>
                                            {getFeatureTypeLabel(col.feature_type)}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-500">{col.dtype}</span>
                                </div>

                                <p className="text-white text-sm mb-2">{col.ai_description}</p>

                                {col.business_meaning && (
                                    <p className="text-gray-400 text-xs mb-2">💼 {col.business_meaning}</p>
                                )}

                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="px-2 py-0.5 bg-white/5 rounded text-gray-400">
                                        고유값: {col.unique_count?.toLocaleString()}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded ${col.null_pct > 10 ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-gray-400'}`}>
                                        결측: {col.null_pct}%
                                    </span>
                                    {col.min !== undefined && (
                                        <span className="px-2 py-0.5 bg-white/5 rounded text-gray-400">
                                            범위: {col.min?.toLocaleString()} ~ {col.max?.toLocaleString()}
                                        </span>
                                    )}
                                </div>

                                {col.analysis_tips?.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-white/10">
                                        <div className="text-xs text-gray-500 mb-1">💡 분석 팁</div>
                                        <ul className="text-xs text-cyan-300 space-y-1">
                                            {col.analysis_tips.slice(0, 2).map((tip, j) => (
                                                <li key={j}>• {tip}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ColumnExplainSection;
