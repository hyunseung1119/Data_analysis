// 파일 정보 카드 컴포넌트
function FileInfoCard({ file, profile }) {
    return (
        <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-2xl">📄</div>
                    <div>
                        <div className="text-white font-semibold text-lg">{file.filename}</div>
                        <div className="text-gray-400 text-sm">
                            {profile.shape.rows.toLocaleString()} 행 × {profile.shape.columns} 열 ·
                            수치형 {file.numeric_columns?.length || 0}개 ·
                            범주형 {file.categorical_columns?.length || 0}개
                        </div>
                    </div>
                </div>
                {profile.warnings.length > 0 && (
                    <div className="text-yellow-400 text-sm">⚠️ 경고 {profile.warnings.length}건</div>
                )}
            </div>
        </div>
    );
}

export default FileInfoCard;
