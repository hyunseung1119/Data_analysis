import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';

/**
 * Confidence Gauge - 신뢰도 게이지 차트
 */
function ConfidenceGauge({ confidence = 0, size = 'medium' }) {
    const percentage = Math.round(confidence * 100);

    // 게이지 데이터
    const data = [
        { name: 'value', value: percentage },
        { name: 'empty', value: 100 - percentage },
    ];

    // 색상 결정
    const getColor = (pct) => {
        if (pct >= 80) return '#10b981'; // green
        if (pct >= 60) return '#3b82f6'; // blue
        if (pct >= 40) return '#f59e0b'; // yellow
        return '#ef4444'; // red
    };

    const color = getColor(percentage);

    const sizeConfig = {
        small: { width: 80, height: 80, innerRadius: 25, outerRadius: 35, fontSize: 14 },
        medium: { width: 120, height: 120, innerRadius: 40, outerRadius: 52, fontSize: 18 },
        large: { width: 160, height: 160, innerRadius: 55, outerRadius: 70, fontSize: 24 },
    };

    const cfg = sizeConfig[size] || sizeConfig.medium;

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center">
            <h4 className="text-xs font-medium text-gray-400 mb-2">종합 신뢰도</h4>

            <div style={{ width: cfg.width, height: cfg.height }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={cfg.innerRadius}
                            outerRadius={cfg.outerRadius}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell fill={color} />
                            <Cell fill="#374151" />
                            <Label
                                value={`${percentage}%`}
                                position="center"
                                dy={-5}
                                fill="#fff"
                                style={{ fontSize: cfg.fontSize, fontWeight: 'bold' }}
                            />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="text-xs text-gray-400 mt-1">
                {percentage >= 80 ? '높은 신뢰도' :
                    percentage >= 60 ? '양호한 신뢰도' :
                        percentage >= 40 ? '보통 신뢰도' : '낮은 신뢰도'}
            </div>
        </div>
    );
}

export default ConfidenceGauge;
