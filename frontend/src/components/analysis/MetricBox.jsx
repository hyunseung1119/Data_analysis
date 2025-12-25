// 메트릭 박스 컴포넌트
function MetricBox({ label, value }) {
    return (
        <div className="bg-white/10 rounded-lg p-3">
            <div className="text-gray-400 text-xs">{label}</div>
            <div className="text-white font-bold">{value}</div>
        </div>
    );
}

export default MetricBox;
