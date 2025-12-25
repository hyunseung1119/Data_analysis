import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Area, ComposedChart, BarChart, Bar, Cell } from 'recharts';

function ForecastTab({ fileId }) {
    const [columns, setColumns] = useState({ date_columns: [], numeric_columns: [] });
    const [dateColumn, setDateColumn] = useState('');
    const [valueColumn, setValueColumn] = useState('');
    const [periods, setPeriods] = useState(30);
    const [loading, setLoading] = useState(false);
    const [forecast, setForecast] = useState(null);
    const [error, setError] = useState(null);

    // What-If states
    const [whatIfColumn, setWhatIfColumn] = useState('');
    const [changePercent, setChangePercent] = useState(10);
    const [whatIfResult, setWhatIfResult] = useState(null);
    const [whatIfLoading, setWhatIfLoading] = useState(false);

    // Anomaly states
    const [anomalyResult, setAnomalyResult] = useState(null);
    const [anomalyLoading, setAnomalyLoading] = useState(false);

    useEffect(() => {
        if (!fileId) return;
        fetch(`/api/analysis/forecast/columns/${fileId}`)
            .then(r => r.json())
            .then(data => {
                setColumns(data);
                if (data.date_columns.length > 0) setDateColumn(data.date_columns[0]);
                if (data.numeric_columns.length > 0) {
                    setValueColumn(data.numeric_columns[0]);
                    setWhatIfColumn(data.numeric_columns[0]);
                }
            })
            .catch(e => console.error(e));
    }, [fileId]);

    const runForecast = async () => {
        if (!dateColumn || !valueColumn) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/analysis/forecast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_id: fileId, date_column: dateColumn, value_column: valueColumn, periods }),
            });
            if (!res.ok) throw new Error((await res.json()).detail || '예측 실패');
            setForecast(await res.json());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const runWhatIf = async () => {
        if (!whatIfColumn) return;
        setWhatIfLoading(true);
        try {
            const res = await fetch('/api/analysis/whatif', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_id: fileId, column: whatIfColumn, change_percent: changePercent }),
            });
            setWhatIfResult(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setWhatIfLoading(false);
        }
    };

    const runAnomaly = async () => {
        setAnomalyLoading(true);
        try {
            const res = await fetch('/api/analysis/anomaly', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_id: fileId, method: 'iqr' }),
            });
            setAnomalyResult(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setAnomalyLoading(false);
        }
    };

    const chartData = forecast ? [...forecast.historical, ...forecast.forecast] : [];

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-2">🔮 예측 분석 엔진</h3>
                <p className="text-gray-300 text-sm">시계열 예측, What-If 시뮬레이션, 이상 탐지로 데이터 기반 의사결정을 지원합니다.</p>
            </div>

            {/* 시계열 예측 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                    📈 시계열 예측
                    <span className="text-xs font-normal text-gray-500 px-2 py-0.5 bg-white/10 rounded-full">Linear Regression</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">날짜 컬럼</label>
                        <select value={dateColumn} onChange={e => setDateColumn(e.target.value)}
                            className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm">
                            {columns.date_columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">예측 대상</label>
                        <select value={valueColumn} onChange={e => setValueColumn(e.target.value)}
                            className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm">
                            {columns.numeric_columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">예측 기간 (일)</label>
                        <input type="number" value={periods} onChange={e => setPeriods(+e.target.value)} min={7} max={365}
                            className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm" />
                    </div>
                    <div className="flex items-end">
                        <button onClick={runForecast} disabled={loading || !dateColumn || !valueColumn}
                            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg text-white font-bold transition-all">
                            {loading ? '분석 중...' : '🔮 예측 실행'}
                        </button>
                    </div>
                </div>

                {error && <div className="text-red-400 text-sm mb-4">❌ {error}</div>}

                {forecast && (
                    <div className="space-y-4">
                        {/* 예측 결과 요약 */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="bg-black/30 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-400">현재 값</div>
                                <div className="text-xl font-bold text-white">{forecast.statistics.current_value.toLocaleString()}</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-400">예측 값</div>
                                <div className="text-xl font-bold text-purple-400">{forecast.statistics.predicted_value.toLocaleString()}</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-400">변화율</div>
                                <div className={`text-xl font-bold ${forecast.statistics.change_rate > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {forecast.statistics.change_rate > 0 ? '+' : ''}{forecast.statistics.change_rate}%
                                </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-400">트렌드</div>
                                <div className="text-xl font-bold text-white">{forecast.statistics.trend}</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-400">신뢰도</div>
                                <div className="text-xl font-bold text-cyan-400">{forecast.statistics.confidence}%</div>
                            </div>
                        </div>

                        {/* 예측 차트 */}
                        <div className="h-80 bg-black/30 rounded-lg p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="date" stroke="#888" fontSize={10} />
                                    <YAxis stroke="#888" fontSize={10} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                                    <Legend />
                                    <Area type="monotone" dataKey="upper" stroke="transparent" fill="#8b5cf6" fillOpacity={0.1} name="상한" />
                                    <Area type="monotone" dataKey="lower" stroke="transparent" fill="#8b5cf6" fillOpacity={0.1} name="하한" />
                                    <Line type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={2} dot={{ r: 2 }} name="실제/예측" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            {/* What-If 시뮬레이션 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h4 className="text-white font-bold mb-4">🎲 What-If 시뮬레이션</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">변경할 컬럼</label>
                        <select value={whatIfColumn} onChange={e => setWhatIfColumn(e.target.value)}
                            className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm">
                            {columns.numeric_columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">변화율 (%)</label>
                        <input type="number" value={changePercent} onChange={e => setChangePercent(+e.target.value)}
                            className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm" />
                    </div>
                    <div className="md:col-span-2 flex items-end">
                        <button onClick={runWhatIf} disabled={whatIfLoading}
                            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg text-white font-bold transition-all">
                            {whatIfLoading ? '계산 중...' : '🎲 시뮬레이션 실행'}
                        </button>
                    </div>
                </div>

                {whatIfResult?.success && (
                    <div className="space-y-3">
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <div className="text-amber-400 font-bold mb-2">📊 시뮬레이션 결과</div>
                            <div className="text-white">{whatIfResult.summary}</div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="bg-black/30 rounded-lg p-3">
                                <div className="text-xs text-gray-400">현재 평균</div>
                                <div className="text-lg font-bold text-white">{whatIfResult.current.mean.toLocaleString()}</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                                <div className="text-xs text-gray-400">시뮬레이션 평균</div>
                                <div className="text-lg font-bold text-amber-400">{whatIfResult.simulated.mean.toLocaleString()}</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                                <div className="text-xs text-gray-400">합계 변화</div>
                                <div className={`text-lg font-bold ${whatIfResult.impact.sum_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {whatIfResult.impact.sum_change > 0 ? '+' : ''}{whatIfResult.impact.sum_change.toLocaleString()}
                                </div>
                            </div>
                        </div>
                        {whatIfResult.correlated_effects?.length > 0 && (
                            <div className="mt-3">
                                <div className="text-sm text-gray-400 mb-2">연관 영향 분석</div>
                                <div className="space-y-2">
                                    {whatIfResult.correlated_effects.map((eff, i) => (
                                        <div key={i} className="flex items-center justify-between bg-black/20 p-2 rounded-lg text-sm">
                                            <span className="text-white">{eff.column}</span>
                                            <span className="text-gray-400">상관: {eff.correlation}</span>
                                            <span className={`font-bold ${eff.estimated_impact > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                예상 {eff.estimated_impact > 0 ? '+' : ''}{eff.estimated_impact}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 이상 탐지 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h4 className="text-white font-bold mb-4 flex items-center justify-between">
                    <span>🚨 이상 탐지</span>
                    <button onClick={runAnomaly} disabled={anomalyLoading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg text-white text-sm font-bold transition-all">
                        {anomalyLoading ? '분석 중...' : '🔍 이상치 탐지'}
                    </button>
                </h4>

                {anomalyResult?.success && (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-lg border ${anomalyResult.overall_severity === 'high' ? 'bg-red-500/10 border-red-500/30' : anomalyResult.overall_severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                            <div className="flex items-center justify-between">
                                <span className={`font-bold ${anomalyResult.overall_severity === 'high' ? 'text-red-400' : anomalyResult.overall_severity === 'medium' ? 'text-yellow-400' : 'text-green-400'}`}>
                                    총 {anomalyResult.total_anomalies}개 이상치 발견
                                </span>
                                <span className="text-gray-400 text-sm">{anomalyResult.recommendation}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {anomalyResult.anomalies.map((a, i) => (
                                <div key={i} className={`p-3 rounded-lg border ${a.severity === 'high' ? 'bg-red-500/10 border-red-500/30' : a.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-white font-medium">{a.column}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${a.severity === 'high' ? 'bg-red-500 text-white' : a.severity === 'medium' ? 'bg-yellow-500 text-black' : 'bg-blue-500 text-white'}`}>{a.severity}</span>
                                    </div>
                                    <div className="text-sm text-gray-400">{a.count}개 ({a.percentage}%)</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ForecastTab;
