import { useState, useEffect } from 'react';
import MetricBox from './MetricBox';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SkeletonEDA } from '../common/Skeleton';

function EDATab({ fileId }) {
    const [edaData, setEdaData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!fileId) return;

        const fetchEDA = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/analysis/eda/${fileId}`);
                if (!res.ok) throw new Error('EDA 로드 실패');
                setEdaData(await res.json());
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchEDA();
    }, [fileId]);

    const handleDownload = async (format = 'csv') => {
        window.open(`/api/analysis/download/${fileId}${format === 'excel' ? '/excel' : ''}`, '_blank');
    };

    if (loading) {
        return <SkeletonEDA />;
    }

    if (error) return <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-red-400 text-center">❌ {error}</div>;
    if (!edaData) return null;

    // 데이터 품질 점수 계산 (간이)
    const missingScore = Math.max(0, 100 - (edaData.missing?.total_pct || 0) * 2);
    const duplicateScore = Math.max(0, 100 - (edaData.duplicates?.pct || 0) * 5);
    const overallScore = Math.round((missingScore * 0.7 + duplicateScore * 0.3));

    const getScoreColor = (score) => score >= 90 ? 'text-green-400' : score >= 70 ? 'text-blue-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
    const getScoreBg = (score) => score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-blue-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className="space-y-6">
            {/* 상단 헤더 & 다운로드 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">🔍 데이터 탐색 (EDA)</h2>
                    <p className="text-gray-400 text-sm">데이터의 품질 상태와 분포를 시각적으로 확인하세요.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleDownload('csv')} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 text-sm flex items-center gap-2 transition-all">
                        <span className="text-green-400">📄</span> CSV 다운로드
                    </button>
                    <button onClick={() => handleDownload('excel')} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 text-sm flex items-center gap-2 transition-all">
                        <span className="text-emerald-400">📊</span> Excel 다운로드
                    </button>
                </div>
            </div>

            {/* 데이터 품질 대시보드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 데이터 품질 점수 */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                    <div className={`absolute top-0 right-0 p-20 rounded-full blur-3xl opacity-10 ${getScoreBg(overallScore)}`} />
                    <h4 className="text-gray-400 text-sm font-medium mb-2">데이터 품질 점수</h4>
                    <div className="flex items-end gap-2">
                        <span className={`text-5xl font-bold ${getScoreColor(overallScore)}`}>{overallScore}</span>
                        <span className="text-gray-500 mb-1">/ 100</span>
                    </div>
                    <div className="mt-4 w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getScoreBg(overallScore)}`} style={{ width: `${overallScore}%` }} />
                    </div>
                    <div className="mt-2 text-xs text-gray-400 flex justify-between">
                        <span>결측률: {edaData.missing?.total_pct}%</span>
                        <span>중복률: {edaData.duplicates?.pct}%</span>
                    </div>
                </div>

                {/* 기본 메트릭 */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <div className="text-gray-400 text-xs mb-1">총 행 수</div>
                        <div className="text-2xl font-bold text-white">{edaData.shape?.rows?.toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-gray-400 text-xs mb-1">총 열 수</div>
                        <div className="text-2xl font-bold text-white">{edaData.shape?.columns}</div>
                    </div>
                    <div>
                        <div className="text-gray-400 text-xs mb-1">메모리 사용</div>
                        <div className="text-2xl font-bold text-white">{edaData.memory_mb} <span className="text-sm text-gray-400">MB</span></div>
                    </div>
                    <div>
                        <div className="text-gray-400 text-xs mb-1">데이터 타입</div>
                        <div className="flex gap-2 text-sm mt-1">
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">수치 {Object.values(edaData.column_types).filter(t => t.includes('int') || t.includes('float')).length}</span>
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">범주 {Object.values(edaData.column_types).filter(t => t.includes('obj') || t.includes('str')).length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 수치형 컬럼 분석 (시각화 포함) */}
            {edaData.numeric_summary?.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                        📊 수치형 변수 분포 <span className="text-xs font-normal text-gray-500 px-2 py-0.5 bg-white/10 rounded-full">{edaData.numeric_summary.length}개</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {edaData.numeric_summary.map((col, idx) => (
                            <div key={idx} className="bg-gray-900/50 border border-white/5 rounded-lg p-4 hover:border-indigo-500/30 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-medium text-indigo-300 truncate w-2/3" title={col.column}>{col.column}</div>
                                    <div className="text-xs text-gray-500 text-right">
                                        Why: {Math.abs(col.skewness) > 1 ? <span className="text-orange-400">Skewed ({col.skewness})</span> : 'Normal'}
                                    </div>
                                </div>
                                <div className="h-24 w-full mb-3">
                                    {col.histogram && (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={col.histogram}>
                                                <Bar dataKey="count" fill="#6366f1" radius={[2, 2, 0, 0]}>
                                                    {col.histogram.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.count > (col.histogram.reduce((a, b) => Math.max(a, b.count), 0) * 0.8) ? '#818cf8' : '#312e81'} />
                                                    ))}
                                                </Bar>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                                                    labelStyle={{ color: '#9ca3af' }}
                                                    formatter={(value) => [value, '빈도']}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 bg-white/5 p-2 rounded">
                                    <div className="flex justify-between"><span>Mean</span> <span className="text-white">{col.mean?.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span>Median</span> <span className="text-white">{col.median?.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span>Min</span> <span className="text-white">{col.min?.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span>Max</span> <span className="text-white">{col.max?.toLocaleString()}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 범주형 컬럼 & 결측치 처리 필요 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 범주형 */}
                {edaData.categorical_summary?.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                        <h4 className="text-white font-medium mb-4">🏷️ 범주형 변수 TOP 5</h4>
                        <div className="space-y-3">
                            {edaData.categorical_summary.map((col, idx) => (
                                <div key={idx} className="bg-gray-900/50 rounded-lg p-3">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-purple-300 font-medium">{col.column}</span>
                                        <span className="text-gray-500 text-xs">{col.unique_count} unique</span>
                                    </div>
                                    <div className="space-y-1">
                                        {col.top_values?.slice(0, 3).map((val, vIdx) => (
                                            <div key={vIdx} className="flex items-center text-xs">
                                                <div className="w-20 truncate text-gray-400 mr-2" title={val.value}>{val.value}</div>
                                                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${val.pct}%` }} />
                                                </div>
                                                <div className="w-10 text-right text-gray-500 ml-2">{val.pct}%</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 결측치 경고 */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h4 className="text-white font-medium mb-4">⚠️ 주요 이슈 알림</h4>
                    {edaData.missing?.details?.length > 0 ? (
                        <div className="space-y-3">
                            {edaData.missing.details.slice(0, 5).map((m, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-bold text-xs">
                                            {m.missing_pct > 50 ? '심각' : '주의'}
                                        </div>
                                        <div>
                                            <div className="text-white text-sm font-medium">{m.column}</div>
                                            <div className="text-red-400 text-xs">{m.missing_count}개 결측 ({m.missing_pct}%)</div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {m.missing_pct > 10 ? '삭제 권장' : '대체 권장'}
                                    </div>
                                </div>
                            ))}
                            <div className="text-center mt-2">
                                <button className="text-xs text-indigo-400 hover:text-indigo-300 underline">전처리 탭에서 수정하기 →</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                            <span className="text-4xl mb-2">✨</span>
                            <p>발견된 결측치가 없습니다.</p>
                            <p className="text-xs mt-1">데이터가 매우 깨끗합니다!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default EDATab;
