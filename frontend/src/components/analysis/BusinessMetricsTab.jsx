import { useState } from 'react';
import MetricBox from './MetricBox';

const METRICS = [
    { id: 'arpu', name: 'ARPU', desc: '유저당 수익', icon: '💰' },
    { id: 'ltv', name: 'LTV', desc: '생애 가치', icon: '💎' },
    { id: 'cac', name: 'CAC', desc: '획득 비용', icon: '📢' },
    { id: 'churn', name: 'Churn', desc: '이탈률', icon: '📉' },
    { id: 'retention', name: 'Retention', desc: '유지율', icon: '🔄' },
    { id: 'mrr', name: 'MRR', desc: '월간 수익', icon: '📅' },
    { id: 'conversion', name: 'Conversion', desc: '전환율', icon: '🎯' },
    { id: 'cohort', name: 'Cohort', desc: '코호트', icon: '👥' },
];

function BusinessMetricsTab({ fileId, columns, numericColumns, categoricalColumns, result, setResult }) {
    const [metricType, setMetricType] = useState('arpu');
    const [revenueCol, setRevenueCol] = useState('');
    const [userCol, setUserCol] = useState('');
    const [dateCol, setDateCol] = useState('');
    const [costCol, setCostCol] = useState('');
    const [eventCol, setEventCol] = useState('');
    const [groupCol, setGroupCol] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const calculate = async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch('/api/analysis/business-metrics', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_id: fileId, metric_type: metricType, revenue_column: revenueCol || null, user_column: userCol || null, date_column: dateCol || null, cost_column: costCol || null, event_column: eventCol || null, group_column: groupCol || null }),
            });
            if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
            setResult(await res.json());
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-white font-medium mb-4">💰 2025 KPI 계산기</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    {METRICS.map((m) => (
                        <button key={m.id} onClick={() => setMetricType(m.id)} className={`p-3 rounded-lg text-left ${metricType === m.id ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
                            <span className="text-xl">{m.icon}</span>
                            <div className="font-medium mt-1">{m.name}</div>
                            <div className="text-xs opacity-75">{m.desc}</div>
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div><label className="block text-gray-400 text-sm mb-2">유저 ID</label><select value={userCol} onChange={(e) => setUserCol(e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white"><option value="">선택</option>{columns.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}</select></div>
                    <div><label className="block text-gray-400 text-sm mb-2">수익</label><select value={revenueCol} onChange={(e) => setRevenueCol(e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white"><option value="">선택</option>{numericColumns?.map((c, i) => <option key={i} value={c}>{c}</option>)}</select></div>
                    <div><label className="block text-gray-400 text-sm mb-2">날짜</label><select value={dateCol} onChange={(e) => setDateCol(e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white"><option value="">선택</option>{columns.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div><label className="block text-gray-400 text-sm mb-2">비용</label><select value={costCol} onChange={(e) => setCostCol(e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white"><option value="">선택</option>{numericColumns?.map((c, i) => <option key={i} value={c}>{c}</option>)}</select></div>
                    <div><label className="block text-gray-400 text-sm mb-2">이벤트</label><select value={eventCol} onChange={(e) => setEventCol(e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white"><option value="">선택</option>{categoricalColumns?.map((c, i) => <option key={i} value={c}>{c}</option>)}</select></div>
                    <div><label className="block text-gray-400 text-sm mb-2">세그먼트</label><select value={groupCol} onChange={(e) => setGroupCol(e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white"><option value="">선택</option>{categoricalColumns?.map((c, i) => <option key={i} value={c}>{c}</option>)}</select></div>
                </div>
                <button onClick={calculate} disabled={loading} className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-600 rounded-lg text-white font-medium">{loading ? '계산 중...' : `📊 ${METRICS.find(m => m.id === metricType)?.name} 계산`}</button>
                {error && <div className="mt-3 text-red-400 text-sm">❌ {error}</div>}
            </div>

            {result && (
                <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-4xl">{METRICS.find(m => m.id === metricType)?.icon}</span>
                        <div><h3 className="text-white text-xl font-bold">{result.metric_name || result.metric}</h3><p className="text-gray-400 text-sm">{result.interpretation}</p></div>
                    </div>
                    {result.value !== undefined && <div className="text-5xl font-bold text-white mb-4">{typeof result.value === 'number' ? result.value.toLocaleString() : result.value}{result.metric !== 'Churn Rate' && result.metric !== 'Retention Rate' && '원'}</div>}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        {result.total_customers && <MetricBox label="고객 수" value={result.total_customers.toLocaleString()} />}
                        {result.total_users && <MetricBox label="유저 수" value={result.total_users.toLocaleString()} />}
                        {result.current_mrr && <MetricBox label="MRR" value={`${result.current_mrr.toLocaleString()}원`} />}
                        {result.arr && <MetricBox label="ARR" value={`${result.arr.toLocaleString()}원`} />}
                    </div>
                    {result.benchmark && (
                        <div className="mt-4 p-3 bg-white/5 rounded-lg">
                            <div className="text-gray-400 text-sm mb-2">벤치마크</div>
                            <div className="grid grid-cols-3 gap-2 text-sm">{Object.entries(result.benchmark).map(([k, v]) => <div key={k} className="text-gray-300"><span className="text-white font-medium">{k}:</span> {v}</div>)}</div>
                        </div>
                    )}
                    {result.cohort_table && (
                        <div className="mt-4 overflow-x-auto">
                            <h4 className="text-white font-medium mb-2">코호트 테이블</h4>
                            <table className="w-full text-sm"><thead><tr className="text-gray-400"><th className="text-left p-2">코호트</th>{['M0', 'M1', 'M2', 'M3', 'M4', 'M5'].map(m => <th key={m} className="p-2">{m}</th>)}</tr></thead>
                                <tbody>{result.cohort_table.map((row, i) => <tr key={i} className="border-t border-white/10"><td className="p-2 text-white">{row.cohort}</td>{['M0', 'M1', 'M2', 'M3', 'M4', 'M5'].map(m => <td key={m} className={`p-2 text-center ${row[m] > 0.5 ? 'text-green-400' : row[m] > 0.2 ? 'text-yellow-400' : 'text-red-400'}`}>{row[m] !== undefined ? `${(row[m] * 100).toFixed(0)}%` : '-'}</td>)}</tr>)}</tbody></table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default BusinessMetricsTab;
