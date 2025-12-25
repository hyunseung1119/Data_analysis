import { useState } from 'react';
import { ScatterChart, Scatter, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import MetricBox from './MetricBox';

// AI 인사이트 탭 - 상세 리포트 형식
function AIInsightsTab({ fileId, insights, setInsights }) {
    const [loading, setLoading] = useState(false);
    const [focusAreas, setFocusAreas] = useState([]);
    const [error, setError] = useState(null);

    const generate = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/analysis/ai-insights', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_id: fileId, analysis_type: 'comprehensive', focus_areas: focusAreas }),
            });
            if (!res.ok) {
                const text = await res.text();
                try {
                    const err = JSON.parse(text);
                    throw new Error(err.detail);
                } catch {
                    throw new Error(`서버 에러: ${text.slice(0, 100)}`);
                }
            }
            setInsights(await res.json());
        } catch (e) {
            setError(e.message);
            console.error(e);
        }
        finally { setLoading(false); }
    };

    const toggle = (area) => setFocusAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);

    return (
        <div className="space-y-4">
            {/* 가이드 */}
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-4">
                <h4 className="text-indigo-400 font-medium mb-2">🤖 AI 데이터 분석 리포트</h4>
                <p className="text-gray-300 text-sm">데이터에서 패턴, 상관관계, 이상치를 자동으로 분석하고 실행 가능한 인사이트를 제공합니다.</p>
                <div className="mt-2 text-xs text-gray-400">✨ 경영진 요약 • 📊 통계 분석 • 💡 핵심 인사이트 • 🎯 실행 권장사항</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-white font-medium mb-4">🔮 분석 옵션</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                    {[{ id: 'growth', label: '🚀 성장' }, { id: 'retention', label: '🔄 리텐션' }, { id: 'revenue', label: '💰 수익' }, { id: 'efficiency', label: '⚡ 효율' }].map((a) => (
                        <button key={a.id} onClick={() => toggle(a.id)} className={`px-3 py-1.5 rounded-full text-sm ${focusAreas.includes(a.id) ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>{a.label}</button>
                    ))}
                </div>
                <button onClick={generate} disabled={loading} className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-lg text-white font-medium transition-all">
                    {loading ? '🔬 AI 분석 중...' : '🔮 AI 인사이트 리포트 생성'}
                </button>
                {error && <div className="mt-3 text-red-400 text-sm">❌ {error}</div>}
            </div>

            {insights && (
                <div className="space-y-4">
                    {/* 경영진 요약 */}
                    {insights.executive_summary && (
                        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-5">
                            <h4 className="text-amber-400 font-bold text-lg mb-3">📋 경영진 요약 (Executive Summary)</h4>
                            <div className="text-gray-200 whitespace-pre-line leading-relaxed">{insights.executive_summary}</div>
                        </div>
                    )}

                    {/* 데이터 품질 점수 */}
                    {insights.quality_report && (
                        <div className={`rounded-xl p-4 ${insights.quality_report.grade === 'A' ? 'bg-green-500/10 border border-green-500/30' : insights.quality_report.grade === 'B' ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-white font-medium">📊 데이터 품질 평가</h4>
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl font-bold text-white">{insights.quality_report.quality_score}점</span>
                                    <span className={`px-3 py-1 rounded-full text-lg font-bold ${insights.quality_report.grade === 'A' ? 'bg-green-500 text-white' : insights.quality_report.grade === 'B' ? 'bg-blue-500 text-white' : 'bg-yellow-500 text-black'}`}>
                                        {insights.quality_report.grade}등급
                                    </span>
                                </div>
                            </div>
                            {insights.quality_report.issues?.length > 0 && (
                                <div className="space-y-2">
                                    {insights.quality_report.issues.slice(0, 3).map((issue, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm">
                                            <span className={`px-1.5 py-0.5 rounded text-xs ${issue.severity === 'critical' ? 'bg-red-500/30 text-red-300' : issue.severity === 'high' ? 'bg-orange-500/30 text-orange-300' : 'bg-yellow-500/30 text-yellow-300'}`}>{issue.severity}</span>
                                            <div>
                                                <span className="text-white">{issue.description}</span>
                                                <span className="text-gray-400 ml-2">→ {issue.recommendation}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 데이터 요약 */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <h4 className="text-white font-medium mb-3">📊 데이터 개요</h4>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                            <MetricBox label="행" value={insights.data_summary?.total_rows?.toLocaleString()} />
                            <MetricBox label="열" value={insights.data_summary?.total_columns} />
                            <MetricBox label="수치형" value={insights.data_summary?.numeric_columns} />
                            <MetricBox label="범주형" value={insights.data_summary?.categorical_columns} />
                            <MetricBox label="결측률" value={`${insights.data_summary?.missing_rate}%`} />
                            <MetricBox label="메모리" value={`${insights.data_summary?.memory_mb}MB`} />
                        </div>
                    </div>

                    {/* 통계 분석 결과 */}
                    {insights.statistical_analysis?.correlations?.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <h4 className="text-white font-medium mb-3">🔗 상관관계 분석</h4>
                            <div className="space-y-3">
                                {insights.statistical_analysis.correlations.slice(0, 5).map((c, i) => (
                                    <div key={i} className="p-3 bg-white/5 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-white font-medium">{c.var1} ↔ {c.var2}</span>
                                            <span className={`px-2 py-0.5 rounded ${Math.abs(c.correlation) > 0.7 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                r = {c.correlation}
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-sm">{c.interpretation}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 핵심 인사이트 */}
                    {insights.key_insights?.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <h4 className="text-white font-medium mb-3">💡 핵심 인사이트 ({insights.key_insights.length}개)</h4>
                            <div className="space-y-4">
                                {insights.key_insights.map((insight, idx) => (
                                    <div key={idx} className={`p-4 rounded-lg border ${insight.priority === 'high' ? 'bg-red-500/10 border-red-500/30' : insight.priority === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{insight.icon}</span>
                                                <span className="text-white font-medium">{insight.title}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-0.5 rounded ${insight.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{insight.priority}</span>
                                                {insight.confidence && <span className="text-xs text-gray-400">신뢰도 {insight.confidence}%</span>}
                                            </div>
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <p className="text-gray-300"><strong>발견:</strong> {insight.finding}</p>
                                            <p className="text-gray-400"><strong>근거:</strong> {insight.evidence}</p>
                                            <p className="text-indigo-300"><strong>비즈니스 함의:</strong> {insight.business_implication}</p>
                                        </div>

                                        {/* 자동 생성된 시각화 */}
                                        {insight.visualization && insight.visualization.data && insight.visualization.data.length > 0 && (
                                            <div className="h-48 mt-3 p-3 bg-black/20 rounded-lg border border-white/5">
                                                <div className="text-xs text-gray-500 mb-2 flex justify-between">
                                                    <span>📊 자동 생성된 시각화: {insight.visualization.type === 'scatter' ? `${insight.visualization.x} vs ${insight.visualization.y}` : insight.visualization.label}</span>
                                                </div>
                                                <ResponsiveContainer width="100%" height="90%">
                                                    {insight.visualization.type === 'scatter' ? (
                                                        <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                                            <XAxis type="number" dataKey={insight.visualization.x} name={insight.visualization.x} stroke="#888" fontSize={10} tickFormatter={(v) => typeof v === 'number' ? v.toFixed(1) : v} />
                                                            <YAxis type="number" dataKey={insight.visualization.y} name={insight.visualization.y} stroke="#888" fontSize={10} tickFormatter={(v) => typeof v === 'number' ? v.toFixed(1) : v} />
                                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', fontSize: '12px' }} />
                                                            <Scatter name="Data" data={insight.visualization.data} fill="#818cf8" />
                                                        </ScatterChart>
                                                    ) : (
                                                        <BarChart data={insight.visualization.data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                                                            <XAxis dataKey="bin" stroke="#888" fontSize={10} />
                                                            <YAxis stroke="#888" fontSize={10} />
                                                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', fontSize: '12px' }} />
                                                            <Bar dataKey="count" fill="#34d399" radius={[4, 4, 0, 0]} />
                                                        </BarChart>
                                                    )}
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 실행 권장사항 */}
                    {insights.recommendations?.length > 0 && (
                        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
                            <h4 className="text-white font-medium mb-3">🎯 실행 권장사항</h4>
                            <div className="space-y-4">
                                {insights.recommendations.map((rec, i) => (
                                    <div key={i} className="p-4 bg-white/5 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{rec.icon}</span>
                                                <span className="text-white font-medium">{rec.title}</span>
                                                <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded">{rec.category}</span>
                                            </div>
                                            <div className="flex gap-2 text-xs">
                                                <span className={`px-2 py-0.5 rounded ${rec.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>우선순위: {rec.priority}</span>
                                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">노력: {rec.effort}</span>
                                            </div>
                                        </div>
                                        <p className="text-gray-300 text-sm mb-2">{rec.description}</p>
                                        <p className="text-gray-400 text-sm mb-2"><strong>근거:</strong> {rec.rationale}</p>
                                        {rec.action_items && (
                                            <div className="bg-white/5 rounded p-2 mt-2">
                                                <div className="text-xs text-gray-400 mb-1">실행 단계:</div>
                                                {rec.action_items.map((item, j) => (
                                                    <div key={j} className="text-sm text-gray-300">{item}</div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="mt-2 text-xs text-green-400">📈 기대 효과: {rec.expected_impact}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 리스크 경고 */}
                    {insights.risk_alerts?.length > 0 && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                            <h4 className="text-white font-medium mb-3">⚠️ 리스크 경고</h4>
                            <div className="space-y-3">
                                {insights.risk_alerts.map((risk, i) => (
                                    <div key={i} className="p-3 bg-white/5 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <span className="text-xl">{risk.icon}</span>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-white font-medium">{risk.title}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded ${risk.severity === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{risk.severity}</span>
                                                </div>
                                                <p className="text-gray-400 text-sm">{risk.description}</p>
                                                <p className="text-gray-500 text-sm mt-1"><strong>영향:</strong> {risk.impact}</p>
                                                <p className="text-green-400 text-sm"><strong>완화 방안:</strong> {risk.mitigation}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 기회 요소 */}
                    {insights.opportunities?.length > 0 && (
                        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4">
                            <h4 className="text-white font-medium mb-3">💡 기회 발견</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {insights.opportunities.map((opp, i) => (
                                    <div key={i} className="p-3 bg-white/5 rounded-lg">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">{opp.icon}</span>
                                            <span className="text-white font-medium">{opp.title}</span>
                                        </div>
                                        <p className="text-gray-400 text-sm">{opp.description}</p>
                                        <p className="text-cyan-400 text-xs mt-1">잠재 효과: {opp.potential_impact}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 다음 단계 */}
                    {insights.next_steps?.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <h4 className="text-white font-medium mb-3">📋 권장 다음 단계</h4>
                            <div className="space-y-2">
                                {insights.next_steps.map((step, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                                        <span className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold">{step.step || i + 1}</span>
                                        <span className="text-lg">{step.icon}</span>
                                        <div>
                                            <span className="text-white font-medium">{step.action}</span>
                                            <span className="text-gray-400 ml-2 text-sm">- {step.detail}</span>
                                        </div>
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

export default AIInsightsTab;
