import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import MetricBox from './MetricBox';

function TimeSeriesTab({ fileId, columns, numericColumns }) {
    const [dateCol, setDateCol] = useState('');
    const [valueCol, setValueCol] = useState('');
    const [period, setPeriod] = useState('M');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const analyze = async () => {
        if (!dateCol || !valueCol) return;
        setLoading(true); setError(null);
        try {
            const res = await fetch('/api/analysis/timeseries', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_id: fileId, date_column: dateCol, value_column: valueCol, period, forecast_periods: 7 }),
            });
            if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
            setResult(await res.json());
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    // 날짜 형식으로 보이는 컬럼 필터링
    const dateColumns = columns.filter(c =>
        c.dtype?.includes('datetime') ||
        c.name.toLowerCase().includes('date') ||
        c.name.toLowerCase().includes('time') ||
        c.name.toLowerCase().includes('날짜') ||
        c.name.toLowerCase().includes('일자')
    );

    return (
        <div className="space-y-4">
            {/* 가이드 박스 */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <h4 className="text-green-400 font-medium mb-2">📖 시계열 분석이란?</h4>
                <p className="text-gray-300 text-sm">시간에 따른 데이터 변화 추세, 계절성, 패턴을 분석합니다.</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">📅 날짜 컬럼: datetime 또는 날짜 문자열</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded">📊 값 컬럼: 수치형 (매출, 방문수 등)</span>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-white font-medium mb-4">📈 시계열 분석</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">📅 날짜 컬럼</label>
                        <select value={dateCol} onChange={(e) => setDateCol(e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white">
                            <option value="">선택</option>
                            {dateColumns.length > 0 ? (
                                dateColumns.map((c, i) => (
                                    <option key={i} value={c.name}>
                                        {c.name} [{c.dtype}] ✓ 추천
                                    </option>
                                ))
                            ) : (
                                columns.map((c, i) => (
                                    <option key={i} value={c.name}>
                                        {c.name} [{c.dtype}]
                                    </option>
                                ))
                            )}
                        </select>
                        {dateColumns.length === 0 && (
                            <p className="text-xs text-orange-400 mt-1">⚠️ 날짜 형식 컬럼이 감지되지 않았습니다</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">📊 값 컬럼 (수치형)</label>
                        <select value={valueCol} onChange={(e) => setValueCol(e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white">
                            <option value="">선택</option>
                            {columns.filter(c => c.dtype?.includes('int') || c.dtype?.includes('float')).map((c, i) => (
                                <option key={i} value={c.name}>
                                    {c.name} [{c.dtype?.split('64')[0]}] (범위: {c.min}~{c.max})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">⏱️ 집계 기간</label>
                        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white">
                            <option value="D">일별 (Daily)</option>
                            <option value="W">주별 (Weekly)</option>
                            <option value="M">월별 (Monthly)</option>
                            <option value="Q">분기별 (Quarterly)</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button onClick={analyze} disabled={loading || !dateCol || !valueCol} className="w-full px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-600 rounded-lg text-white font-medium">
                            {loading ? '분석 중...' : '📊 시계열 분석'}
                        </button>
                    </div>
                </div>

                {/* 선택된 컬럼 정보 */}
                {(dateCol || valueCol) && (
                    <div className="flex flex-wrap gap-2 text-xs mb-3">
                        {dateCol && columns.find(c => c.name === dateCol) && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded">
                                📅 {dateCol} • {columns.find(c => c.name === dateCol)?.dtype} • {columns.find(c => c.name === dateCol)?.unique}개 날짜
                            </span>
                        )}
                        {valueCol && columns.find(c => c.name === valueCol) && (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                                📊 {valueCol} • 범위: {columns.find(c => c.name === valueCol)?.min} ~ {columns.find(c => c.name === valueCol)?.max}
                            </span>
                        )}
                    </div>
                )}

                {error && <div className="text-red-400 text-sm">❌ {error}</div>}
            </div>

            {result && (
                <div className="space-y-4">
                    {/* 트렌드 요약 */}
                    <div className={`p-4 rounded-xl ${result.trend.direction === '상승' ? 'bg-green-500/10 border border-green-500/30' : result.trend.direction === '하락' ? 'bg-red-500/10 border border-red-500/30' : 'bg-gray-500/10 border border-gray-500/30'}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl">{result.trend.direction === '상승' ? '📈' : result.trend.direction === '하락' ? '📉' : '➡️'}</span>
                            <div>
                                <div className={`font-bold text-lg ${result.trend.direction === '상승' ? 'text-green-400' : result.trend.direction === '하락' ? 'text-red-400' : 'text-gray-400'}`}>{result.trend.direction} 추세</div>
                                <div className="text-gray-300 text-sm">{result.trend.interpretation}</div>
                            </div>
                        </div>
                    </div>

                    {/* 요약 통계 */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <MetricBox label="총 기간 수" value={result.summary.total_periods} />
                        <MetricBox label="총 합계" value={result.summary.total_sum.toLocaleString()} />
                        <MetricBox label="기간 평균" value={result.summary.avg_per_period.toLocaleString()} />
                        <MetricBox label="최대 기간" value={result.summary.max_period} />
                        <MetricBox label="최대값" value={result.summary.max_value.toLocaleString()} />
                        <MetricBox label="변동성" value={result.volatility.interpretation} />
                    </div>

                    {/* 시계열 차트 */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <h4 className="text-white font-medium mb-3">📊 시계열 추이</h4>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={result.time_series}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="period" stroke="#888" angle={-45} textAnchor="end" height={60} fontSize={10} />
                                    <YAxis stroke="#888" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444' }} />
                                    <Area type="monotone" dataKey="sum" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 이동평균 */}
                    {result.moving_averages?.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <h4 className="text-white font-medium mb-3">📉 이동평균</h4>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={result.moving_averages}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="period" stroke="#888" fontSize={10} />
                                        <YAxis stroke="#888" />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444' }} />
                                        <Legend />
                                        <Line type="monotone" dataKey="ma3" name="3기 이동평균" stroke="#10b981" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="ma7" name="7기 이동평균" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* 예측 */}
                    {result.forecast?.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <h4 className="text-white font-medium mb-3">🔮 예측값</h4>
                            <div className="grid grid-cols-7 gap-2">
                                {result.forecast.map((f, i) => (
                                    <div key={i} className="bg-indigo-500/20 rounded-lg p-3 text-center">
                                        <div className="text-gray-400 text-xs">{f.period}</div>
                                        <div className="text-white font-bold">{f.value.toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 변화율 */}
                    {result.growth_rates?.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <h4 className="text-white font-medium mb-3">📊 기간별 변화율</h4>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                {result.growth_rates.map((g, i) => (
                                    <div key={i} className="bg-white/5 rounded-lg p-3">
                                        <div className="text-gray-400 text-xs">{g.from} → {g.to}</div>
                                        <div className={`font-bold ${g.rate >= 0 ? 'text-green-400' : 'text-red-400'}`}>{g.rate >= 0 ? '+' : ''}{g.rate}%</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 계절성 */}
                    {result.seasonality?.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <h4 className="text-white font-medium mb-3">🗓️ 월별 패턴</h4>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={result.seasonality}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="month" stroke="#888" />
                                        <YAxis stroke="#888" />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444' }} />
                                        <Bar dataKey="avg" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default TimeSeriesTab;
