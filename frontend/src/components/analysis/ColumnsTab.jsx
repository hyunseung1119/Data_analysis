// 컬럼 정보 탭 컴포넌트
function ColumnsTab({ profile }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-indigo-600 to-purple-600">
                        <tr>
                            <th className="text-left py-3 px-4 text-white font-medium">컬럼명</th>
                            <th className="text-left py-3 px-4 text-white font-medium">타입</th>
                            <th className="text-right py-3 px-4 text-white font-medium">결측치</th>
                            <th className="text-right py-3 px-4 text-white font-medium">고유값</th>
                            <th className="text-right py-3 px-4 text-white font-medium">평균</th>
                            <th className="text-right py-3 px-4 text-white font-medium">중앙값</th>
                            <th className="text-right py-3 px-4 text-white font-medium">표준편차</th>
                            <th className="text-right py-3 px-4 text-white font-medium">범위</th>
                        </tr>
                    </thead>
                    <tbody>
                        {profile.columns.map((col, i) => (
                            <tr key={i} className={`border-b border-white/5 hover:bg-white/5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                                <td className="py-3 px-4 text-white font-medium">{col.name}</td>
                                <td className="py-3 px-4">
                                    <span className={`px-2 py-0.5 rounded text-xs ${col.dtype.includes('int') || col.dtype.includes('float') ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                                        {col.dtype}
                                    </span>
                                </td>
                                <td className={`py-3 px-4 text-right ${col.missing_pct > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>{col.missing_pct}%</td>
                                <td className="py-3 px-4 text-right text-gray-300">{col.unique}</td>
                                <td className="py-3 px-4 text-right text-gray-300">{col.mean ?? '-'}</td>
                                <td className="py-3 px-4 text-right text-gray-300">{col.median ?? '-'}</td>
                                <td className="py-3 px-4 text-right text-gray-300">{col.std ?? '-'}</td>
                                <td className="py-3 px-4 text-right text-gray-300">{col.min !== undefined ? `${col.min} ~ ${col.max}` : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ColumnsTab;
