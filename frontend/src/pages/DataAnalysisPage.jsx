import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

// 컴포넌트 임포트
import {
    FileInfoCard,
    OverviewTab,
    ColumnsTab,
    VisualizeTab,
    CorrelationTab,
    ABTestTab,
    BusinessMetricsTab,
    AIInsightsTab,
    TimeSeriesTab,
    SegmentTab,
    EDATab,
    PreprocessTab,
    AIPreprocessTab,
    ForecastTab
} from '../components/analysis';

/**
 * Data Analysis Page - CSV 업로드 및 고급 자동 분석
 * 리팩토링: 모듈화된 컴포넌트 사용
 */
function DataAnalysisPage() {
    // 상태 관리
    const [uploadedFile, setUploadedFile] = useState(null);
    const [profile, setProfile] = useState(null);
    const [correlation, setCorrelation] = useState(null);
    const [abTestResult, setAbTestResult] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [metricsResult, setMetricsResult] = useState(null);
    const [aiInsights, setAiInsights] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    // 파일 업로드 핸들러
    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/analysis/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('파일 업로드 실패');

            const data = await response.json();
            setUploadedFile(data);

            // 자동 프로파일링
            const profileRes = await fetch(`/api/analysis/profile/${data.file_id}`);
            const profileData = await profileRes.json();
            setProfile(profileData);

            // 상관관계 분석
            try {
                const corrRes = await fetch(`/api/analysis/correlation/${data.file_id}`);
                if (corrRes.ok) {
                    const corrData = await corrRes.json();
                    setCorrelation(corrData);
                }
            } catch (e) {
                console.log('Correlation analysis not available');
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
        },
        maxFiles: 1,
    });

    const resetAnalysis = () => {
        setUploadedFile(null);
        setProfile(null);
        setCorrelation(null);
        setAbTestResult(null);
        setChartData(null);
        setMetricsResult(null);
        setAiInsights(null);
        setActiveTab('overview');
    };

    // 탭 정의
    const TABS = [
        { id: 'overview', icon: '📋', label: '개요' },
        { id: 'ai_preprocess', icon: '🧠', label: 'AI 진단' },
        { id: 'eda', icon: '🔍', label: 'EDA' },
        { id: 'preprocess', icon: '🔧', label: '전처리' },
        { id: 'columns', icon: '📊', label: '컬럼' },
        { id: 'visualize', icon: '📈', label: '시각화' },
        { id: 'timeseries', icon: '📉', label: '시계열' },
        { id: 'forecast', icon: '🔮', label: '예측' },
        { id: 'segment', icon: '🎯', label: '세그먼트' },
        { id: 'metrics', icon: '💰', label: 'KPI' },
        { id: 'abtest', icon: '🧪', label: 'A/B' },
        { id: 'correlation', icon: '🔗', label: '상관' },
        { id: 'insights', icon: '🤖', label: 'AI' },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">📊 고급 데이터 분석</h1>
                    <p className="text-gray-400 text-sm">CSV 업로드 → 자동 분석 → 시각화 → 인사이트</p>
                </div>
                {uploadedFile && (
                    <button onClick={resetAnalysis} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-gray-300 text-sm">
                        🔄 새 파일 분석
                    </button>
                )}
            </div>

            {/* Upload Area */}
            {!uploadedFile && (
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${isDragActive
                        ? 'border-indigo-500 bg-indigo-500/10 scale-105'
                        : 'border-white/20 hover:border-white/40 bg-white/5'
                        }`}
                >
                    <input {...getInputProps()} />
                    <div className="text-6xl mb-4">📁</div>
                    {isDragActive ? (
                        <p className="text-indigo-400 text-xl">파일을 여기에 놓으세요...</p>
                    ) : (
                        <>
                            <p className="text-gray-300 text-xl mb-2">CSV 파일을 드래그하거나 클릭하여 선택</p>
                            <p className="text-gray-500">지원 형식: .csv, .xlsx, .xls (최대 50MB)</p>
                        </>
                    )}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
                    <span className="ml-4 text-gray-300 text-lg">데이터 분석 중...</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                    ❌ {error}
                </div>
            )}

            {/* Analysis Results */}
            {uploadedFile && profile && !loading && (
                <div className="space-y-6">
                    <FileInfoCard file={uploadedFile} profile={profile} />

                    {/* Tabs */}
                    <div className="flex gap-2 border-b border-white/10 pb-2 overflow-x-auto">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-indigo-500 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'overview' && <OverviewTab profile={profile} fileId={uploadedFile.file_id} />}
                    {activeTab === 'columns' && <ColumnsTab profile={profile} />}
                    {activeTab === 'visualize' && (
                        <VisualizeTab
                            fileId={uploadedFile.file_id}
                            columns={profile.columns}
                            numericColumns={uploadedFile.numeric_columns}
                            categoricalColumns={uploadedFile.categorical_columns}
                            chartData={chartData}
                            setChartData={setChartData}
                        />
                    )}
                    {activeTab === 'metrics' && (
                        <BusinessMetricsTab
                            fileId={uploadedFile.file_id}
                            columns={profile.columns}
                            numericColumns={uploadedFile.numeric_columns}
                            categoricalColumns={uploadedFile.categorical_columns}
                            result={metricsResult}
                            setResult={setMetricsResult}
                        />
                    )}
                    {activeTab === 'abtest' && (
                        <ABTestTab
                            fileId={uploadedFile.file_id}
                            columns={profile.columns}
                            numericColumns={uploadedFile.numeric_columns}
                            result={abTestResult}
                            setResult={setAbTestResult}
                        />
                    )}
                    {activeTab === 'correlation' && <CorrelationTab correlation={correlation} />}
                    {activeTab === 'timeseries' && (
                        <TimeSeriesTab
                            fileId={uploadedFile.file_id}
                            columns={profile.columns}
                            numericColumns={uploadedFile.numeric_columns}
                        />
                    )}
                    {activeTab === 'segment' && (
                        <SegmentTab
                            fileId={uploadedFile.file_id}
                            columns={profile.columns}
                            numericColumns={uploadedFile.numeric_columns}
                            categoricalColumns={uploadedFile.categorical_columns}
                        />
                    )}
                    {activeTab === 'insights' && (
                        <AIInsightsTab
                            fileId={uploadedFile.file_id}
                            insights={aiInsights}
                            setInsights={setAiInsights}
                        />
                    )}
                    {activeTab === 'eda' && (
                        <EDATab fileId={uploadedFile.file_id} />
                    )}
                    {activeTab === 'ai_preprocess' && (
                        <AIPreprocessTab
                            fileId={uploadedFile.file_id}
                        />
                    )}
                    {activeTab === 'preprocess' && (
                        <PreprocessTab
                            fileId={uploadedFile.file_id}
                            onFileIdChange={(newId) => setUploadedFile(prev => ({ ...prev, file_id: newId }))}
                        />
                    )}
                    {activeTab === 'forecast' && (
                        <ForecastTab fileId={uploadedFile.file_id} />
                    )}
                </div>
            )}
        </div>
    );
}

export default DataAnalysisPage;
