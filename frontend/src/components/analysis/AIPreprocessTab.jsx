import { useState } from 'react';

function AIPreprocessTab({ fileId, onApplyFix, onFileIdChange }) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Code Generator States
    const [codeInstruction, setCodeInstruction] = useState('');
    const [generatedCode, setGeneratedCode] = useState(null);
    const [codeLoading, setCodeLoading] = useState(false);

    // Execute States
    const [executing, setExecuting] = useState(false);
    const [executeResult, setExecuteResult] = useState(null);

    const runDiagnosis = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/analysis/ai-preprocess/diagnose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_id: fileId }),
            });
            if (!res.ok) throw new Error('AI 진단 실패');
            setResult(await res.json());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const generateCode = async () => {
        if (!codeInstruction.trim()) return;
        setCodeLoading(true);
        setExecuteResult(null);
        try {
            const res = await fetch('/api/analysis/ai-preprocess/generate-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_id: fileId, instruction: codeInstruction }),
            });
            if (!res.ok) throw new Error('코드 생성 실패');
            setGeneratedCode(await res.json());
        } catch (e) {
            setGeneratedCode({ success: false, code: '', explanation: e.message, warnings: [e.message] });
        } finally {
            setCodeLoading(false);
        }
    };

    const executeCode = async () => {
        if (!generatedCode?.code) return;
        setExecuting(true);
        setExecuteResult(null);
        try {
            const res = await fetch('/api/analysis/ai-preprocess/execute-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_id: fileId, instruction: codeInstruction }),
            });
            const data = await res.json();
            setExecuteResult(data);

            // Update fileId if execution was successful
            if (data.success && data.new_file_id && onFileIdChange) {
                onFileIdChange(data.new_file_id);
            }
        } catch (e) {
            setExecuteResult({ success: false, error: e.message });
        } finally {
            setExecuting(false);
        }
    };

    const copyToClipboard = () => {
        if (generatedCode?.code) {
            navigator.clipboard.writeText(generatedCode.code);
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* AI 진단 섹션 */}
            <div className="bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/30 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-white mb-2">🤖 AI 데이터 품질 진단</h3>
                    <p className="text-gray-300 text-sm">
                        AI가 데이터의 의미를 분석하여 <span className="text-violet-300 font-bold">표준화, 의미적 이상치, 개인정보</span> 이슈를 찾아냅니다.
                    </p>
                </div>
                <button
                    onClick={runDiagnosis}
                    disabled={loading}
                    className="px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-bold shadow-lg shadow-violet-600/30 transition-all transform hover:scale-105"
                >
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            AI 분석 중...
                        </span>
                    ) : '🔍 AI 진단 시작'}
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                    ❌ 오류가 발생했습니다: {error}
                </div>
            )}

            {/* AI 코드 생성기 섹션 */}
            <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-2">⚡ AI 자연어 전처리</h3>
                <p className="text-gray-300 text-sm mb-4">
                    자연어로 지시하면 AI가 코드를 생성하고 <span className="text-emerald-300 font-bold">바로 실행</span>합니다.
                </p>
                <div className="flex gap-3 mb-4">
                    <input
                        type="text"
                        value={codeInstruction}
                        onChange={(e) => setCodeInstruction(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && generateCode()}
                        placeholder="예: 결측치를 평균으로 채워줘, 나이 컬럼을 문자열로 변환해줘"
                        className="flex-1 px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none transition-colors"
                    />
                    <button
                        onClick={generateCode}
                        disabled={codeLoading || !codeInstruction.trim()}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-bold transition-all"
                    >
                        {codeLoading ? '생성 중...' : '🪄 코드 생성'}
                    </button>
                </div>

                {generatedCode && (
                    <div className={`rounded-lg border ${generatedCode.success ? 'bg-black/30 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'} p-4`}>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-400">생성된 코드</span>
                            <div className="flex gap-2">
                                <button onClick={copyToClipboard} className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-gray-300 transition-colors">
                                    📋 복사
                                </button>
                                {generatedCode.success && (
                                    <button
                                        onClick={executeCode}
                                        disabled={executing}
                                        className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded text-white font-bold transition-colors"
                                    >
                                        {executing ? '⏳ 실행 중...' : '▶️ 바로 실행'}
                                    </button>
                                )}
                            </div>
                        </div>
                        <pre className="text-sm text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap mb-3">{generatedCode.code || '코드 없음'}</pre>
                        <div className="text-sm text-gray-400 border-t border-white/10 pt-3">
                            <strong>설명:</strong> {generatedCode.explanation}
                        </div>
                        {generatedCode.warnings?.length > 0 && (
                            <div className="mt-2 text-xs text-orange-400">
                                ⚠️ {generatedCode.warnings.join(', ')}
                            </div>
                        )}
                    </div>
                )}

                {/* 실행 결과 */}
                {executeResult && (
                    <div className={`mt-4 rounded-lg border p-4 ${executeResult.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        {executeResult.success ? (
                            <div>
                                <div className="flex items-center gap-2 text-green-400 font-bold mb-2">
                                    ✅ 코드 실행 완료!
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div className="bg-black/20 rounded p-2 text-center">
                                        <div className="text-gray-400 text-xs">이전 행</div>
                                        <div className="text-white font-bold">{executeResult.changes?.rows_before?.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-black/20 rounded p-2 text-center">
                                        <div className="text-gray-400 text-xs">현재 행</div>
                                        <div className="text-emerald-400 font-bold">{executeResult.changes?.rows_after?.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-black/20 rounded p-2 text-center">
                                        <div className="text-gray-400 text-xs">이전 열</div>
                                        <div className="text-white font-bold">{executeResult.changes?.columns_before}</div>
                                    </div>
                                    <div className="bg-black/20 rounded p-2 text-center">
                                        <div className="text-gray-400 text-xs">현재 열</div>
                                        <div className="text-emerald-400 font-bold">{executeResult.changes?.columns_after}</div>
                                    </div>
                                </div>
                                <div className="mt-3 text-xs text-gray-400">
                                    💾 새 데이터 ID: <code className="bg-black/30 px-1 rounded">{executeResult.new_file_id}</code>
                                </div>
                            </div>
                        ) : (
                            <div className="text-red-400">
                                <strong>❌ 실행 실패:</strong> {executeResult.error}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {result && (
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-medium">
                            진단 결과 <span className="ml-2 px-2 py-0.5 bg-white/10 rounded-full text-sm text-gray-300">{result.total_issues}건 발견</span>
                        </h4>
                    </div>

                    {result.issues.length === 0 ? (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-8 text-center">
                            <span className="text-4xl mb-4 block">✨</span>
                            <h4 className="text-green-400 font-bold text-lg mb-2">완벽합니다!</h4>
                            <p className="text-gray-400">AI가 심각한 데이터 품질 문제를 발견하지 못했습니다.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {result.issues.map((issue, idx) => (
                                <div key={idx} className={`bg-gray-800/50 border rounded-xl p-5 hover:border-gray-600 transition-all ${issue.severity === 'high' ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]' :
                                    issue.severity === 'medium' ? 'border-orange-500/50' : 'border-blue-500/50'
                                    }`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${issue.severity === 'high' ? 'bg-red-500 text-white' :
                                                issue.severity === 'medium' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
                                                }`}>
                                                {issue.severity}
                                            </span>
                                            <span className="text-gray-400 text-sm font-mono bg-black/30 px-2 py-0.5 rounded">
                                                {issue.column}
                                            </span>
                                            <span className="text-gray-500 text-xs px-2 py-0.5 border border-white/10 rounded-full">
                                                {issue.type}
                                            </span>
                                        </div>
                                    </div>

                                    <h5 className="text-white font-bold mb-2">{issue.description}</h5>

                                    <div className="bg-black/20 rounded-lg p-3 mb-3">
                                        <div className="text-xs text-gray-400 mb-1">AI 제안</div>
                                        <div className="text-violet-300 text-sm font-medium">💡 {issue.suggestion}</div>
                                    </div>

                                    {/* Action Buttons (Placeholder for Phase 2) */}
                                    {onApplyFix && (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => onApplyFix(issue)}
                                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-colors"
                                            >
                                                수동 수정
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!result && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 opacity-50">
                    <span className="text-6xl mb-4 grayscale">🧠</span>
                    <p>AI 진단을 실행하여 숨겨진 문제를 찾아보세요</p>
                </div>
            )}
        </div>
    );
}

export default AIPreprocessTab;
