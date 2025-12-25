import StatCard from './StatCard';
import ColumnExplainSection from './ColumnExplainSection';

// 개요 탭 컴포넌트
function OverviewTab({ profile, fileId }) {
    return (
        <div className="space-y-6">
            {/* 기본 통계 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="행 수" value={profile.shape.rows.toLocaleString()} icon="📄" color="blue" />
                <StatCard title="열 수" value={profile.shape.columns} icon="📊" color="purple" />
                <StatCard title="결측치 컬럼" value={Object.keys(profile.missing_summary).length} icon="⚠️" color="yellow" />
                <StatCard title="데이터 품질" value={profile.warnings.length === 0 ? '양호' : '주의'} icon={profile.warnings.length === 0 ? '✅' : '⚠️'} color={profile.warnings.length === 0 ? 'green' : 'red'} />
            </div>

            {profile.warnings.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <h4 className="text-yellow-400 font-medium mb-2">⚠️ 데이터 품질 경고</h4>
                    <ul className="space-y-1">
                        {profile.warnings.map((w, i) => (
                            <li key={i} className="text-yellow-300/80 text-sm">• {w}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* AI 컬럼 분석 섹션 */}
            {fileId && <ColumnExplainSection fileId={fileId} />}
        </div>
    );
}

export default OverviewTab;

