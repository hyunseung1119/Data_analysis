import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import StatBox from './StatBox';

// A/B 테스트 탭 컴포넌트 - 그룹 선택 기능 추가
function ABTestTab({ fileId, columns, numericColumns, result, setResult }) {
    const [groupCol, setGroupCol] = useState('');
    const [groupValues, setGroupValues] = useState([]);  // 선택된 컬럼의 그룹 목록
    const [groupA, setGroupA] = useState('');
    const [groupB, setGroupB] = useState('');
    const [metricCol, setMetricCol] = useState('');
    const [testType, setTestType] = useState('ttest');
    const [alpha, setAlpha] = useState(0.05);
    const [oneTailed, setOneTailed] = useState(false);
    const [bootstrap, setBootstrap] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [error, setError] = useState(null);

    // 그룹 컬럼 선택 시 고유값 조회
    useEffect(() => {
        if (!groupCol || !fileId) {
            setGroupValues([]);
            setGroupA('');
            setGroupB('');
            return;
        }

        const fetchGroupValues = async () => {
            setLoadingGroups(true);
            try {
                const res = await fetch(`/api/analysis/column-values/${fileId}/${groupCol}`);
                if (!res.ok) throw new Error('그룹 값 조회 실패');
                const data = await res.json();
                setGroupValues(data.values || []);

                // 자동으로 상위 2개 그룹 선택
                if (data.values?.length >= 2) {
                    setGroupA(data.values[0].value);
                    setGroupB(data.values[1].value);
                }
            } catch (e) {
                console.error(e);
                setGroupValues([]);
            } finally {
                setLoadingGroups(false);
            }
        };

        fetchGroupValues();
    }, [fileId, groupCol]);

    const runTest = async () => {
        if (!groupCol || !metricCol || !groupA || !groupB) return;
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/analysis/ab-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_id: fileId,
                    group_column: groupCol,
                    metric_column: metricCol,
                    alpha,
                    test_type: testType,
                    one_tailed: oneTailed,
                    bootstrap_iterations: bootstrap ? 1000 : 0,
                    group_a_value: groupA,
                    group_b_value: groupB
                }),
            });
            if (!response.ok) {
                const text = await response.text();
                try {
                    const err = JSON.parse(text);
                    throw new Error(err.detail);
                } catch {
                    throw new Error(`서버 에러: ${text.slice(0, 100)}`);
                }
            }
            setResult(await response.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // 수치형 컬럼
    const numericCols = columns.filter(c => c.dtype?.includes('int') || c.dtype?.includes('float'));
    // 그룹 가능한 컬럼 (고유값 2~100개)
    const groupableCols = columns.filter(c => c.unique >= 2 && c.unique <= 100);

    const aggregateDistribution = (data, groupAName, groupBName) => {
        if (!data || data.length === 0) return [];
        const values = data.map(d => d.value);
        const min = Math.min(...values), max = Math.max(...values), binSize = (max - min) / 10;
        return Array.from({ length: 10 }, (_, i) => {
            const binStart = min + i * binSize;
            return {
                bin: `${binStart.toFixed(1)}`,
                [groupAName]: data.filter(d => d.group === groupAName && d.value >= binStart && d.value < binStart + binSize).length,
                [groupBName]: data.filter(d => d.group === groupBName && d.value >= binStart && d.value < binStart + binSize).length
            };
        });
    };

    return (
        <div className="space-y-4">
            {/* 가이드 박스 */}
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
                <h4 className="text-indigo-400 font-medium mb-2">📖 A/B 테스트란?</h4>
                <p className="text-gray-300 text-sm">두 그룹(A와 B) 간의 특정 지표 차이가 통계적으로 유의미한지 검정합니다.</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">🏷️ 그룹 컬럼: 범주형 (2개 이상)</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded">📊 측정 지표: 수치형</span>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-white font-medium mb-4">🧪 A/B 테스트 설정</h4>

                {/* Step 1: 그룹 컬럼 선택 */}
                <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-2">1️⃣ 그룹 컬럼 선택 (범주형, 2~100개 그룹)</label>
                    <select
                        value={groupCol}
                        onChange={(e) => setGroupCol(e.target.value)}
                        className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                    >
                        <option value="">선택하세요</option>
                        {groupableCols.map((c, i) => (
                            <option key={i} value={c.name}>
                                {c.name} [{c.dtype}] ({c.unique}개 그룹)
                            </option>
                        ))}
                    </select>
                </div>

                {/* Step 2: 그룹 A/B 선택 */}
                {groupValues.length > 0 && (
                    <div className="mb-4 p-3 bg-white/5 rounded-lg">
                        <label className="block text-gray-400 text-sm mb-2">
                            2️⃣ 비교할 그룹 선택
                            <span className="text-indigo-400 ml-2">({groupValues.length}개 그룹 중 2개 선택)</span>
                        </label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                                <label className="block text-blue-400 text-xs mb-1">🅰️ 그룹 A (대조군)</label>
                                <select
                                    value={groupA}
                                    onChange={(e) => setGroupA(e.target.value)}
                                    className="w-full bg-gray-800 border border-blue-500/30 rounded-lg px-3 py-2 text-white"
                                >
                                    <option value="">선택</option>
                                    {groupValues.map((g, i) => (
                                        <option key={i} value={g.value} disabled={g.value === groupB}>
                                            {g.value} ({g.count.toLocaleString()}건, {g.percentage}%)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-purple-400 text-xs mb-1">🅱️ 그룹 B (실험군)</label>
                                <select
                                    value={groupB}
                                    onChange={(e) => setGroupB(e.target.value)}
                                    className="w-full bg-gray-800 border border-purple-500/30 rounded-lg px-3 py-2 text-white"
                                >
                                    <option value="">선택</option>
                                    {groupValues.map((g, i) => (
                                        <option key={i} value={g.value} disabled={g.value === groupA}>
                                            {g.value} ({g.count.toLocaleString()}건, {g.percentage}%)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* 그룹 미리보기 */}
                        {groupA && groupB && (
                            <div className="flex gap-4 text-sm">
                                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full">
                                    A: {groupA} ({groupValues.find(g => g.value === groupA)?.count.toLocaleString()}건)
                                </span>
                                <span className="text-gray-500">vs</span>
                                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full">
                                    B: {groupB} ({groupValues.find(g => g.value === groupB)?.count.toLocaleString()}건)
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {loadingGroups && (
                    <div className="text-indigo-400 text-sm mb-4 animate-pulse">⏳ 그룹 목록 조회 중...</div>
                )}

                {/* Step 3: 측정 지표 선택 */}
                <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-2">3️⃣ 측정 지표 (수치형)</label>
                    <select
                        value={metricCol}
                        onChange={(e) => setMetricCol(e.target.value)}
                        className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                    >
                        <option value="">선택하세요</option>
                        {numericCols.map((c, i) => (
                            <option key={i} value={c.name}>
                                {c.name} (범위: {c.min} ~ {c.max})
                            </option>
                        ))}
                    </select>
                </div>

                {/* 고급 옵션 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="block text-gray-400 text-xs mb-1">검정 방법</label>
                        <select value={testType} onChange={(e) => setTestType(e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm">
                            <option value="ttest">t-검정</option>
                            <option value="welch">Welch t</option>
                            <option value="mannwhitney">Mann-Whitney</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-xs mb-1">유의수준</label>
                        <select value={alpha} onChange={(e) => setAlpha(parseFloat(e.target.value))} className="w-full bg-gray-800 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm">
                            <option value={0.01}>0.01</option>
                            <option value={0.05}>0.05</option>
                            <option value={0.1}>0.10</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                        <input type="checkbox" id="oneTailed" checked={oneTailed} onChange={(e) => setOneTailed(e.target.checked)} className="w-4 h-4 rounded" />
                        <label htmlFor="oneTailed" className="text-gray-300 text-sm">단측 검정</label>
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                        <input type="checkbox" id="bootstrap" checked={bootstrap} onChange={(e) => setBootstrap(e.target.checked)} className="w-4 h-4 rounded" />
                        <label htmlFor="bootstrap" className="text-gray-300 text-sm">부트스트랩</label>
                    </div>
                </div>

                <button
                    onClick={runTest}
                    disabled={!groupCol || !metricCol || !groupA || !groupB || loading}
                    className="w-full px-4 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-600 rounded-lg text-white font-medium transition-all"
                >
                    {loading ? '🔬 분석 중...' : '🧪 A/B 테스트 실행'}
                </button>

                {error && <div className="mt-3 text-red-400 text-sm">❌ {error}</div>}
            </div>

            {/* 결과 */}
            {result && (
                <div className="space-y-4">
                    <div className={`p-4 rounded-xl ${result.is_significant ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{result.is_significant ? '✅' : '⚠️'}</span>
                            <span className={`font-bold text-lg ${result.is_significant ? 'text-green-400' : 'text-yellow-400'}`}>
                                {result.is_significant ? '통계적으로 유의함' : '유의하지 않음'}
                            </span>
                        </div>
                        <p className="text-gray-300 text-sm">{result.conclusion}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                            <div className="text-blue-400 font-medium mb-2">🅰️ 그룹 A: {result.group_a.name}</div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>평균: <span className="text-white font-mono">{result.group_a.mean}</span></div>
                                <div>N: <span className="text-white font-mono">{result.group_a.n?.toLocaleString()}</span></div>
                            </div>
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                            <div className="text-purple-400 font-medium mb-2">🅱️ 그룹 B: {result.group_b.name}</div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>평균: <span className="text-white font-mono">{result.group_b.mean}</span></div>
                                <div>N: <span className="text-white font-mono">{result.group_b.n?.toLocaleString()}</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <h4 className="text-white font-medium mb-3">📊 상세 통계</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatBox label="p-value" value={result.p_value} highlight={result.p_value < 0.05 ? 'green' : 'yellow'} />
                            <StatBox label="효과 크기 (d)" value={result.effect_size} />
                            <StatBox label="검정력" value={`${(result.power * 100).toFixed(1)}%`} highlight={result.power > 0.8 ? 'green' : 'yellow'} />
                            <StatBox label="권장 표본" value={result.sample_size_recommendation} />
                        </div>
                    </div>

                    {result.distribution_data?.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <h4 className="text-white font-medium mb-3">📈 분포 비교</h4>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={aggregateDistribution(result.distribution_data, result.group_a.name, result.group_b.name)}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="bin" stroke="#888" />
                                        <YAxis stroke="#888" />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444' }} />
                                        <Legend />
                                        <Bar dataKey={result.group_a.name} fill="#3b82f6" />
                                        <Bar dataKey={result.group_b.name} fill="#8b5cf6" />
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

export default ABTestTab;
