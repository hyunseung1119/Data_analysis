import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import MetricBox from './MetricBox';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];

function SegmentTab({ fileId, columns, numericColumns, categoricalColumns }) {
    const [segmentCol, setSegmentCol] = useState('');
    const [metricCols, setMetricCols] = useState([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const analyze = async () => {
        if (!segmentCol) return;
        setLoading(true); setError(null);
        try {
            const res = await fetch('/api/analysis/segment', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_id: fileId, segment_column: segmentCol, metric_columns: metricCols, top_n: 10 }),
            });
            if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
            setResult(await res.json());
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    const toggleMetric = (col) => {
        setMetricCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col].slice(0, 5));
    };

    return (
        <div className="space-y-4">
            {/* 상세 가이드 박스 */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <h4 className="text-purple-400 font-medium mb-2">📖 세그먼트 분석이란?</h4>
                <p className="text-gray-300 text-sm mb-3">
                    <strong>세그먼트(Segment)</strong>는 특정 기준으로 나눈 <strong>고객/데이터 그룹</strong>입니다.
                    예를 들어, "지역별", "연령대별", "등급별"로 데이터를 나누어 각 그룹의 특성을 비교합니다.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-white font-medium text-sm mb-1">🎯 활용 예시</div>
                        <ul className="text-gray-400 text-xs space-y-1">
                            <li>• <strong>지역별</strong> 매출 비교 → "어느 지역이 가장 많이 사나?"</li>
                            <li>• <strong>고객 등급별</strong> 구매 금액 → "VIP와 일반 고객 차이는?"</li>
                            <li>• <strong>연령대별</strong> 방문 빈도 → "20대 vs 40대 행동 차이"</li>
                            <li>• <strong>채널별</strong> 전환율 → "앱 vs 웹 성과 비교"</li>
                        </ul>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-white font-medium text-sm mb-1">📊 분석 결과</div>
                        <ul className="text-gray-400 text-xs space-y-1">
                            <li>• 세그먼트별 <strong>평균, 합계, 건수</strong></li>
                            <li>• 그룹 간 <strong>통계적 차이 검정</strong> (ANOVA)</li>
                            <li>• 각 세그먼트의 <strong>특성 프로파일</strong></li>
                            <li>• 지표별 <strong>상위/하위 그룹</strong> 순위</li>
                        </ul>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded">🏷️ 세그먼트 컬럼: 범주형 (지역, 성별, 등급 등)</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded">📊 지표 컬럼: 수치형 (매출, 점수, 횟수 등)</span>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-white font-medium mb-4">🎯 세그먼트 분석</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">🏷️ 세그먼트 컬럼 (그룹화 기준)</label>
                        <select value={segmentCol} onChange={(e) => setSegmentCol(e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white">
                            <option value="">선택</option>
                            {/* 우선: 범주형 + 유니크 100개 미만 */}
                            {columns.filter(c =>
                                (c.dtype?.includes('object') || c.dtype?.includes('str') || c.dtype?.includes('category') || categoricalColumns?.includes(c.name)) &&
                                c.unique && c.unique < 100
                            ).map((c, i) => (
                                <option key={`cat-${i}`} value={c.name}>
                                    {c.name} [{c.dtype}] ({c.unique}개 그룹) ✓ 추천
                                </option>
                            ))}
                            {/* 보조: 수치형이지만 유니크 20개 미만 (등급 등) */}
                            {columns.filter(c =>
                                (c.dtype?.includes('int') || c.dtype?.includes('float')) &&
                                c.unique && c.unique < 20
                            ).map((c, i) => (
                                <option key={`num-${i}`} value={c.name}>
                                    {c.name} [{c.dtype}] ({c.unique}개 그룹)
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">범주형 또는 고유값이 적은 컬럼만 표시됩니다</p>
                    </div>
                    <div className="flex items-end">
                        <button onClick={analyze} disabled={loading || !segmentCol} className="w-full px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-600 rounded-lg text-white font-medium">
                            {loading ? '분석 중...' : '🎯 세그먼트 분석'}
                        </button>
                    </div>
                </div>

                {/* 선택된 세그먼트 정보 */}
                {segmentCol && columns.find(c => c.name === segmentCol) && (
                    <div className="mb-3 px-3 py-2 bg-purple-500/20 text-purple-300 rounded-lg text-sm">
                        📊 <strong>{segmentCol}</strong> • {columns.find(c => c.name === segmentCol)?.dtype} • <strong>{columns.find(c => c.name === segmentCol)?.unique}개</strong> 세그먼트 그룹
                    </div>
                )}

                <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-2">📊 분석할 지표 (수치형, 최대 5개)</label>
                    <div className="flex flex-wrap gap-2">
                        {columns.filter(c => c.dtype?.includes('int') || c.dtype?.includes('float')).map((c, i) => (
                            <button
                                key={i}
                                onClick={() => toggleMetric(c.name)}
                                className={`px-3 py-1 rounded-full text-sm ${metricCols.includes(c.name) ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                            >
                                {c.name} ({c.min}~{c.max})
                            </button>
                        ))}
                    </div>
                    {metricCols.length > 0 && (
                        <div className="mt-2 text-xs text-gray-400">
                            선택됨: {metricCols.join(', ')}
                        </div>
                    )}
                </div>
                {error && <div className="text-red-400 text-sm">❌ {error}</div>}
            </div>

            {result && (
                <div className="space-y-4">
                    {/* 요약 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <MetricBox label="세그먼트 컬럼" value={result.segment_column} />
                        <MetricBox label="전체 세그먼트 수" value={result.total_segments} />
                        <MetricBox label="분석된 세그먼트" value={result.analyzed_segments} />
                        <MetricBox label="유의 차이 발견" value={`${result.comparisons.filter(c => c.significant).length}개`} />
                    </div>

                    {/* 인사이트 */}
                    <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-4">
                        <h4 className="text-white font-medium mb-3">💡 주요 인사이트</h4>
                        <div className="space-y-2">
                            {result.insights.map((ins, i) => <div key={i} className="text-gray-300 text-sm">{ins}</div>)}
                        </div>
                    </div>

                    {/* 세그먼트 분포 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <h4 className="text-white font-medium mb-3">📊 세그먼트 분포</h4>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={result.distribution} dataKey="count" nameKey="segment" cx="50%" cy="50%" outerRadius={80} label={({ segment, percentage }) => `${segment} (${percentage}%)`} labelLine={false}>
                                            {result.distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <h4 className="text-white font-medium mb-3">📈 세그먼트 크기</h4>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={result.distribution} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis type="number" stroke="#888" />
                                        <YAxis type="category" dataKey="segment" stroke="#888" width={100} fontSize={11} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444' }} />
                                        <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* 세그먼트별 통계 */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 overflow-x-auto">
                        <h4 className="text-white font-medium mb-3">📋 세그먼트별 통계</h4>
                        <table className="w-full text-sm">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="text-left py-2 px-3 text-gray-400">세그먼트</th>
                                    <th className="text-right py-2 px-3 text-gray-400">건수</th>
                                    <th className="text-right py-2 px-3 text-gray-400">비율</th>
                                    {metricCols.slice(0, 3).map(m => <th key={m} className="text-right py-2 px-3 text-gray-400">{m} (평균)</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {result.segment_stats.map((s, i) => (
                                    <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                                        <td className="py-2 px-3 text-white font-medium">{s.segment}</td>
                                        <td className="py-2 px-3 text-right text-gray-300">{s.count.toLocaleString()}</td>
                                        <td className="py-2 px-3 text-right text-gray-300">{s.percentage}%</td>
                                        {metricCols.slice(0, 3).map(m => <td key={m} className="py-2 px-3 text-right text-gray-300">{s[`${m}_mean`]?.toLocaleString() ?? '-'}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 통계적 비교 */}
                    {result.comparisons?.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <h4 className="text-white font-medium mb-3">🔬 통계적 비교 (ANOVA)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {result.comparisons.map((c, i) => (
                                    <div key={i} className={`p-3 rounded-lg ${c.significant ? 'bg-green-500/10 border border-green-500/30' : 'bg-gray-500/10 border border-gray-500/30'}`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-white font-medium">{c.metric}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded ${c.significant ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{c.significant ? '유의' : '무의'}</span>
                                        </div>
                                        <div className="text-gray-400 text-sm">F={c.f_statistic}, p={c.p_value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 세그먼트 프로파일 */}
                    {result.profiles?.filter(p => p.traits.length > 0).length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <h4 className="text-white font-medium mb-3">👥 세그먼트 특성</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {result.profiles.filter(p => p.traits.length > 0).map((p, i) => (
                                    <div key={i} className="bg-white/5 rounded-lg p-3">
                                        <div className="text-white font-medium mb-2">{p.segment}</div>
                                        <div className="space-y-1">
                                            {p.traits.map((t, j) => (
                                                <div key={j} className={`text-sm ${t.diff_pct > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {t.description}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 순위 */}
                    {Object.keys(result.rankings).length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <h4 className="text-white font-medium mb-3">🏆 지표별 순위</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {Object.entries(result.rankings).map(([metric, r], i) => (
                                    <div key={i} className="bg-white/5 rounded-lg p-3">
                                        <div className="text-gray-400 text-sm mb-2">{metric}</div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-green-400">🥇 {r.top}: {r.top_value}</span>
                                            <span className="text-red-400">📉 {r.bottom}: {r.bottom_value}</span>
                                        </div>
                                        <div className="text-gray-500 text-xs mt-1">차이: {r.gap}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default SegmentTab;
