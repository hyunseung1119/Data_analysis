import { useState, useEffect } from 'react';

// 전처리 탭 컴포넌트
function PreprocessTab({ fileId, onFileIdChange }) {
    const [activeStep, setActiveStep] = useState('missing');
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [method, setMethod] = useState('drop');
    const [threshold, setThreshold] = useState(1.5);
    const [constantValue, setConstantValue] = useState(0);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [columns, setColumns] = useState([]);
    const [edaStats, setEdaStats] = useState(null);

    // 컬럼 목록 및 EDA 통계 조회
    useEffect(() => {
        if (!fileId) return;

        // 프로파일 조회
        fetch(`/api/analysis/profile/${fileId}`)
            .then(res => res.json())
            .then(data => setColumns(data.columns || []))
            .catch(() => { });

        // EDA 통계 조회 (스마트 추천용)
        fetch(`/api/analysis/eda/${fileId}`)
            .then(res => res.json())
            .then(data => setEdaStats(data))
            .catch(() => { });
    }, [fileId]);

    const steps = [
        { id: 'missing', icon: '🔧', label: '결측치 처리', desc: '비어있는 값(NaN) 채우기/삭제' },
        { id: 'outliers', icon: '📍', label: '이상치 처리', desc: '통계적 이상값 탐지 및 제거' },
        { id: 'duplicates', icon: '🔁', label: '중복 제거', desc: '완전히 동일한 중복 행 삭제' },
        { id: 'convert', icon: '🔄', label: '타입 변환', desc: '숫자/날짜/텍스트 형식 변환' },
    ];

    const getSuggestion = (stepId) => {
        if (!edaStats) return null;
        if (stepId === 'missing') {
            const missingCount = edaStats.missing?.total_missing || 0;
            if (missingCount > 0) return { type: 'alert', msg: `${missingCount}개의 결측치가 발견되었습니다.` };
            return { type: 'success', msg: '결측치가 없습니다. 이 단계는 건너뛰셔도 됩니다.' };
        }
        if (stepId === 'outliers') {
            const outlierCount = edaStats.outliers?.reduce((acc, curr) => acc + curr.outlier_count, 0) || 0;
            if (outlierCount > 0) return { type: 'alert', msg: `약 ${outlierCount}개의 이상치가 IQR 기준으로 탐지되었습니다.` };
        }
        if (stepId === 'duplicates') {
            const dupCount = edaStats.duplicates?.count || 0;
            if (dupCount > 0) return { type: 'alert', msg: `${dupCount}개의 중복 행이 있습니다. 제거를 권장합니다.` };
            return { type: 'success', msg: '중복된 행이 없습니다.' };
        }
        return null;
    };

    const handleProcess = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        let endpoint = '';
        let body = { file_id: fileId, columns: selectedColumns, method, threshold };

        if (activeStep === 'missing') {
            endpoint = '/api/analysis/preprocess/missing';
            body.operation = 'handle_missing';
            body.constant_value = constantValue;
        } else if (activeStep === 'outliers') {
            endpoint = '/api/analysis/preprocess/outliers';
            body.operation = 'handle_outliers';
        } else if (activeStep === 'duplicates') {
            endpoint = '/api/analysis/preprocess/duplicates';
            body.operation = 'remove_duplicates';
        } else if (activeStep === 'convert') {
            endpoint = '/api/analysis/preprocess/convert-type';
            body.operation = 'convert_type';
        }

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const text = await res.text();
                try {
                    const err = JSON.parse(text);
                    throw new Error(err.detail || '처리 실패');
                } catch {
                    throw new Error(`서버 에러: ${text.slice(0, 100)}`);
                }
            }

            const data = await res.json();
            setResult(data);
            if (data.new_file_id && onFileIdChange) {
                onFileIdChange(data.new_file_id);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        const targetFileId = result?.new_file_id || fileId;
        window.open(`/api/analysis/download/${targetFileId}`, '_blank');
    };

    const toggleColumn = (colName) => {
        setSelectedColumns(prev =>
            prev.includes(colName) ? prev.filter(c => c !== colName) : [...prev, colName]
        );
    };

    const numericCols = columns.filter(c => c.dtype?.includes('int') || c.dtype?.includes('float'));
    const suggestion = getSuggestion(activeStep);

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* 상단 파이프라인 스테퍼 */}
            <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl mb-2 overflow-x-auto">
                {steps.map((step, idx) => (
                    <div key={step.id} className="flex items-center min-w-[120px]">
                        <button
                            onClick={() => { setActiveStep(step.id); setResult(null); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${activeStep === step.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <span className="text-xl">{step.icon}</span>
                            <div className="text-left">
                                <div className="text-sm font-medium">{step.label}</div>
                            </div>
                        </button>
                        {idx < steps.length - 1 && <div className="h-0.5 w-8 bg-gray-700 mx-2" />}
                    </div>
                ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-full">
                {/* 왼쪽: 설정 패널 */}
                <div className="flex-1 space-y-4">
                    {/* 스마트 추천 메시지 */}
                    {suggestion && (
                        <div className={`p-4 rounded-xl border flex items-start gap-3 ${suggestion.type === 'alert' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                            <span className="text-lg">{suggestion.type === 'alert' ? '💡' : '✨'}</span>
                            <div>
                                <h5 className={`font-bold text-sm ${suggestion.type === 'alert' ? 'text-orange-400' : 'text-green-400'}`}>AI 분석 제안</h5>
                                <p className="text-gray-300 text-sm">{suggestion.msg}</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h4 className="text-xl font-bold text-white mb-1">{steps.find(s => s.id === activeStep)?.label}</h4>
                                <p className="text-gray-400 text-sm">{steps.find(s => s.id === activeStep)?.desc}</p>
                            </div>
                            {loading && <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full" />}
                        </div>

                        {/* 컬럼 선택 (중복 제거 제외) */}
                        {activeStep !== 'duplicates' && (
                            <div className="mb-6">
                                <label className="block text-gray-400 text-xs uppercase font-bold mb-3 tracking-wider">
                                    대상 컬럼 선택 <span className="text-gray-500 font-normal normal-case">(기본: 전체)</span>
                                </label>
                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-black/20 rounded-lg">
                                    {(activeStep === 'missing' ? columns : numericCols).length > 0 ? (
                                        (activeStep === 'missing' ? columns : numericCols).map((col, i) => (
                                            <button
                                                key={i}
                                                onClick={() => toggleColumn(col.name)}
                                                className={`px-3 py-1.5 rounded-md text-sm transition-all border ${selectedColumns.includes(col.name) ? 'bg-indigo-500 border-indigo-500 text-white shadow-md' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                            >
                                                {col.name}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="text-gray-500 text-sm px-2">대상 컬럼이 없습니다.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 옵션 선택 영역 */}
                        <div className="mb-6">
                            <label className="block text-gray-400 text-xs uppercase font-bold mb-3 tracking-wider">처리 방법</label>

                            {/* 결측치 처리 옵션 */}
                            {activeStep === 'missing' && (
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'drop', label: '행 삭제', desc: '결측치가 포함된 행 제거' },
                                        { id: 'mean', label: '평균값', desc: '평균으로 채우기 (수치형)' },
                                        { id: 'median', label: '중앙값', desc: '중앙값으로 채우기 (이상치 강건)' },
                                        { id: 'mode', label: '최빈값', desc: '가장 자주 나오는 값' },
                                        { id: 'constant', label: '상수값', desc: '특정 값으로 지정' },
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setMethod(m.id)}
                                            className={`text-left p-3 rounded-lg border transition-all ${method === m.id ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            <div className="font-bold text-sm">{m.label}</div>
                                            <div className="text-xs opacity-70">{m.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {method === 'constant' && activeStep === 'missing' && (
                                <div className="mt-4">
                                    <input
                                        type="number"
                                        placeholder="대체할 값 입력"
                                        value={constantValue}
                                        onChange={(e) => setConstantValue(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            )}

                            {/* 이상치 처리 옵션 */}
                            {activeStep === 'outliers' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'drop', label: '삭제', desc: '제거' },
                                            { id: 'clip', label: '클리핑', desc: '상/하한 제한' },
                                            { id: 'median_replace', label: '대체', desc: '중앙값' },
                                        ].map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => setMethod(m.id)}
                                                className={`text-center p-3 rounded-lg border transition-all ${method === m.id ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                            >
                                                <div className="font-bold text-sm">{m.label}</div>
                                                <div className="text-xs opacity-70">{m.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-lg">
                                        <div className="flex justify-between mb-2 text-sm text-gray-400">
                                            <span>IQR 임계값 (민감도)</span>
                                            <span className="text-white font-bold">{threshold}x</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="3.0"
                                            step="0.1"
                                            value={threshold}
                                            onChange={(e) => setThreshold(parseFloat(e.target.value))}
                                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>엄격함 (0.5)</span>
                                            <span>느슨함 (3.0)</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 타입 변환 옵션 */}
                            {activeStep === 'convert' && (
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'numeric', label: '🔢 숫자형', desc: '문자를 숫자로' },
                                        { id: 'datetime', label: '📅 날짜형', desc: '문자를 날짜로' },
                                        { id: 'string', label: 'ABC 문자열', desc: '숫자를 문자로' },
                                        { id: 'category', label: '🏷️ 범주형', desc: '메모리 절약' },
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setMethod(m.id)}
                                            className={`text-left p-3 rounded-lg border transition-all ${method === m.id ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            <div className="font-bold text-sm">{m.label}</div>
                                            <div className="text-xs opacity-70">{m.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/10">
                            <button
                                onClick={handleProcess}
                                disabled={loading || (suggestion?.type === 'success' && activeStep !== 'convert')} // 성공 상태면 굳이? 하지만 강제 실행 가능하게 할수도. 일단 풀어둠이 나을듯.
                                className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-bold shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95"
                            >
                                {loading ? '처리 중...' : '⚡ 실행하기'}
                            </button>
                            <button
                                onClick={handleDownload}
                                className="px-5 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium"
                            >
                                📥 원본 받기
                            </button>
                        </div>

                        {error && <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm">❌ {error}</div>}
                    </div>
                </div>

                {/* 오른쪽: 결과 미리보기 패널 */}
                <div className="w-full lg:w-80 flex-shrink-0">
                    {result ? (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 h-full animation-fade-in">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">✓</div>
                                <h4 className="text-green-400 font-bold">처리 완료!</h4>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-black/20 rounded-lg p-4">
                                    <div className="text-sm text-gray-400 mb-1">데이터 변화</div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-2xl font-bold text-white">{result.changes?.rows_before}</span>
                                        <span className="text-gray-500 mb-1">→</span>
                                        <span className="text-2xl font-bold text-white">{result.changes?.rows_after}</span>
                                        <span className="text-xs text-gray-400 mb-1">행</span>
                                    </div>
                                    <div className="mt-2 text-xs text-yellow-400">
                                        {(result.changes?.rows_removed || result.changes?.outliers_affected || 0)}개 데이터 변경됨
                                    </div>
                                </div>

                                <div className="p-3 bg-white/5 rounded-lg">
                                    <div className="text-xs text-gray-400 mb-2">적용된 방법</div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded">{result.changes?.method}</span>
                                        {activeStep === 'outliers' && <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">IQR {result.changes?.threshold}x</span>}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => window.open(`/api/analysis/download/${result.new_file_id}`, '_blank')}
                                className="w-full mt-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold shadow-lg shadow-green-600/20 transition-all"
                            >
                                📥 결과 다운로드
                            </button>

                            <p className="text-center text-xs text-green-400/60 mt-4">
                                * 원본 파일은 유지됩니다.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-5 h-full flex flex-col items-center justify-center text-center text-gray-500">
                            <span className="text-4xl mb-3 grayscale opacity-30">{steps.find(s => s.id === activeStep)?.icon}</span>
                            <p className="text-sm">설정을 선택하고<br />실행 버튼을 눌러주세요.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PreprocessTab;
