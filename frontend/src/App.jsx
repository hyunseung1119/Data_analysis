import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';
import AnalysisDashboardPage from './pages/AnalysisDashboardPage';
import DataAnalysisPage from './pages/DataAnalysisPage';

function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen">
                {/* Header */}
                <header className="bg-gray-900/50 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                                <span className="text-xl">🤖</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">Multi-Agent Decision</h1>
                                <p className="text-xs text-gray-400">AI 의사결정 지원 시스템</p>
                            </div>
                        </Link>

                        <nav className="flex gap-2">
                            <Link
                                to="/"
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                💬 채팅
                            </Link>
                            <Link
                                to="/data"
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                📂 데이터
                            </Link>
                            <Link
                                to="/analysis"
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                📈 분석
                            </Link>
                            <Link
                                to="/dashboard"
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                📊 대시보드
                            </Link>
                        </nav>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto">
                    <Routes>
                        <Route path="/" element={<ChatPage />} />
                        <Route path="/data" element={<DataAnalysisPage />} />
                        <Route path="/analysis" element={<AnalysisDashboardPage />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;


