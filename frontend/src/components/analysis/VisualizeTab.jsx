import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, ScatterChart, Scatter, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// 시각화 탭 컴포넌트 - 자동 차트 생성
function VisualizeTab({ fileId, columns, numericColumns, categoricalColumns, chartData, setChartData }) {
    const [chartType, setChartType] = useState('histogram');
    const [xColumn, setXColumn] = useState('');
    const [yColumn, setYColumn] = useState('');
    const [groupBy, setGroupBy] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 수치형/범주형 컬럼 분리
    const numericCols = columns.filter(c => c.dtype?.includes('int') || c.dtype?.includes('float'));
    const categoryCols = columns.filter(c => c.unique && c.unique < 50);

    // 차트 생성 함수
    const generateChart = useCallback(async (type, x, y) => {
        if (!x) return;

        // 차트 타입에 따른 자동 검증
        if (type === 'histogram' && !numericCols.find(c => c.name === x)) {
            setError('히스토그램은 수치형 컬럼만 가능합니다');
            return;
        }
        if ((type === 'scatter' || type === 'line') && !y) {
            return; // Y축 필요한 차트는 Y 선택 후 생성
        }

        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/analysis/chart-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_id: fileId, chart_type: type, x_column: x, y_column: y || null, group_by: groupBy || null, bins: 20 }),
            });
            if (!response.ok) {
                // 서버 에러 시 JSON이 아닐 수 있음
                const text = await response.text();
                try {
                    const err = JSON.parse(text);
                    throw new Error(err.detail || '차트 생성 실패');
                } catch {
                    throw new Error(`서버 에러 (${response.status}): ${text.slice(0, 100)}`);
                }
            }
            setChartData(await response.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [fileId, groupBy, numericCols, setChartData]);

    // X축 선택 시 자동 차트 생성
    useEffect(() => {
        if (xColumn) {
            generateChart(chartType, xColumn, yColumn);
        }
    }, [xColumn]); // eslint-disable-line

    // Y축 선택 시 자동 차트 생성 (산점도, 라인)
    useEffect(() => {
        if (yColumn && xColumn && (chartType === 'scatter' || chartType === 'line')) {
            generateChart(chartType, xColumn, yColumn);
        }
    }, [yColumn]); // eslint-disable-line

    // 차트 타입 변경 시 자동 재생성
    useEffect(() => {
        if (xColumn) {
            generateChart(chartType, xColumn, yColumn);
        }
    }, [chartType]); // eslint-disable-line

    // 첫 번째 수치형 컬럼으로 자동 선택
    useEffect(() => {
        if (numericCols.length > 0 && !xColumn) {
            setXColumn(numericCols[0].name);
        }
    }, [numericCols, xColumn]);

    // 선택된 컬럼 정보 가져오기
    const getColumnInfo = (colName) => columns.find(c => c.name === colName);
    const selectedXInfo = getColumnInfo(xColumn);
    const selectedYInfo = getColumnInfo(yColumn);

    return (
        <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-medium">📈 인터랙티브 차트</h4>
                    {loading && <span className="text-indigo-400 text-sm animate-pulse">⏳ 생성 중...</span>}
                </div>

                {/* 차트 타입 빠른 선택 */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {[
                        { id: 'histogram', icon: '📊', label: '히스토그램', needY: false },
                        { id: 'bar', icon: '📉', label: '막대', needY: false },
                        { id: 'scatter', icon: '⚬', label: '산점도', needY: true },
                        { id: 'line', icon: '📈', label: '라인', needY: true },
                        { id: 'boxplot', icon: '📦', label: '박스플롯', needY: true },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setChartType(t.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${chartType === t.id ? 'bg-indigo-500 text-white scale-105' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* 컬럼 선택 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-gray-400 text-xs mb-1">X축 {chartType === 'histogram' ? '(수치형)' : ''}</label>
                        <select
                            value={xColumn}
                            onChange={(e) => setXColumn(e.target.value)}
                            className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                        >
                            <option value="">선택</option>
                            {(chartType === 'histogram' ? numericCols : columns).map((c, i) => (
                                <option key={i} value={c.name}>
                                    {c.name} [{c.dtype?.split('64')[0]}] ({c.unique}개)
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-xs mb-1">Y축 (수치형)</label>
                        <select
                            value={yColumn}
                            onChange={(e) => setYColumn(e.target.value)}
                            className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                            disabled={chartType === 'histogram' || chartType === 'bar'}
                        >
                            <option value="">{chartType === 'scatter' || chartType === 'line' ? '필수 선택' : '선택 (선택사항)'}</option>
                            {numericCols.map((c, i) => (
                                <option key={i} value={c.name}>
                                    {c.name} (범위: {c.min}~{c.max})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-xs mb-1">그룹화 (선택)</label>
                        <select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value)}
                            className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                        >
                            <option value="">없음</option>
                            {categoryCols.map((c, i) => (
                                <option key={i} value={c.name}>{c.name} ({c.unique}개)</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 선택 정보 */}
                {(selectedXInfo || selectedYInfo) && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {selectedXInfo && <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">X: {selectedXInfo.name} • {selectedXInfo.dtype}</span>}
                        {selectedYInfo && <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded">Y: {selectedYInfo.name} • {selectedYInfo.dtype}</span>}
                    </div>
                )}

                {error && <div className="mt-3 text-red-400 text-sm">❌ {error}</div>}
            </div>

            {/* 차트 영역 */}
            {chartData && !loading && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-white font-medium">{chartData.chart_type?.toUpperCase()} • {chartData.column || xColumn}</h4>
                        {chartData.correlation && <span className="text-indigo-400 text-sm">상관계수: {chartData.correlation}</span>}
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartData.chart_type === 'histogram' || chartData.chart_type === 'bar' ? (
                                <BarChart data={chartData.data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey={chartData.chart_type === 'histogram' ? 'bin' : 'category'} stroke="#888" angle={-45} textAnchor="end" height={80} fontSize={10} />
                                    <YAxis stroke="#888" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444' }} />
                                    <Bar dataKey={chartData.chart_type === 'histogram' ? 'count' : 'value'} fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            ) : chartData.chart_type === 'scatter' ? (
                                <ScatterChart>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="x" stroke="#888" name={xColumn} />
                                    <YAxis dataKey="y" stroke="#888" name={yColumn} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444' }} />
                                    <Scatter data={chartData.data} fill="#8b5cf6" />
                                </ScatterChart>
                            ) : chartData.chart_type === 'line' ? (
                                <LineChart data={chartData.data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="x" stroke="#888" />
                                    <YAxis stroke="#888" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444' }} />
                                    <Line type="monotone" dataKey="y" stroke="#6366f1" strokeWidth={2} dot={false} />
                                </LineChart>
                            ) : chartData.chart_type === 'boxplot' && chartData.data?.[0] ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="grid grid-cols-5 gap-4 text-sm">
                                            <div className="bg-white/10 rounded p-3"><div className="text-gray-400">최소</div><div className="text-white font-bold">{chartData.data[0].min?.toFixed(2)}</div></div>
                                            <div className="bg-white/10 rounded p-3"><div className="text-gray-400">Q1</div><div className="text-white font-bold">{chartData.data[0].q1?.toFixed(2)}</div></div>
                                            <div className="bg-indigo-500/30 rounded p-3"><div className="text-gray-400">중앙값</div><div className="text-white font-bold">{chartData.data[0].median?.toFixed(2)}</div></div>
                                            <div className="bg-white/10 rounded p-3"><div className="text-gray-400">Q3</div><div className="text-white font-bold">{chartData.data[0].q3?.toFixed(2)}</div></div>
                                            <div className="bg-white/10 rounded p-3"><div className="text-gray-400">최대</div><div className="text-white font-bold">{chartData.data[0].max?.toFixed(2)}</div></div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">차트 데이터 없음</div>
                            )}
                        </ResponsiveContainer>
                    </div>
                    {chartData.stats && (
                        <div className="mt-4 grid grid-cols-4 gap-3">
                            <div className="bg-white/5 rounded-lg p-3 text-center"><div className="text-gray-400 text-xs">평균</div><div className="text-white font-bold">{chartData.stats.mean?.toLocaleString()}</div></div>
                            <div className="bg-white/5 rounded-lg p-3 text-center"><div className="text-gray-400 text-xs">표준편차</div><div className="text-white font-bold">{chartData.stats.std?.toLocaleString()}</div></div>
                            <div className="bg-white/5 rounded-lg p-3 text-center"><div className="text-gray-400 text-xs">최소</div><div className="text-white font-bold">{chartData.stats.min?.toLocaleString()}</div></div>
                            <div className="bg-white/5 rounded-lg p-3 text-center"><div className="text-gray-400 text-xs">최대</div><div className="text-white font-bold">{chartData.stats.max?.toLocaleString()}</div></div>
                        </div>
                    )}
                </div>
            )}

            {/* 빠른 컬럼 선택 버튼 */}
            {numericCols.length > 1 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h4 className="text-white font-medium text-sm mb-3">⚡ 빠른 X축 선택</h4>
                    <div className="flex flex-wrap gap-2">
                        {numericCols.slice(0, 8).map((c, i) => (
                            <button
                                key={i}
                                onClick={() => setXColumn(c.name)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${xColumn === c.name ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                    }`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default VisualizeTab;
