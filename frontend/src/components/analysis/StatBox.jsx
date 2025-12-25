// 통계 박스 컴포넌트
function StatBox({ label, value, highlight }) {
    const colors = {
        green: 'text-green-400',
        yellow: 'text-yellow-400',
    };

    return (
        <div className="bg-white/5 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">{label}</div>
            <div className={`text-white font-mono ${highlight ? colors[highlight] : ''}`}>{value}</div>
        </div>
    );
}

export default StatBox;
