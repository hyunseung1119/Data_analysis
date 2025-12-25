// 통계 카드 컴포넌트
function StatCard({ title, value, icon, color = 'blue' }) {
    const colors = {
        blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
        purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
        yellow: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
        green: 'from-green-500/20 to-green-600/20 border-green-500/30',
        red: 'from-red-500/20 to-red-600/20 border-red-500/30',
    };

    return (
        <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
            <div className="flex items-center gap-3">
                <span className="text-3xl">{icon}</span>
                <div>
                    <div className="text-gray-400 text-sm">{title}</div>
                    <div className="text-white text-2xl font-bold">{value}</div>
                </div>
            </div>
        </div>
    );
}

export default StatCard;
