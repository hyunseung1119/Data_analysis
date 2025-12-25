import { useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import AgentFlowChart from '../components/charts/AgentFlowChart';
import ScenarioCompareChart from '../components/charts/ScenarioCompareChart';
import RiskHeatmap from '../components/charts/RiskHeatmap';
import ConfidenceGauge from '../components/charts/ConfidenceGauge';
import ExecutionTimeline from '../components/charts/ExecutionTimeline';
import { ChartContainer } from '../components/charts/ChartExport';

/**
 * Analysis Dashboard - 종합 분석 대시보드
 */
function AnalysisDashboardPage() {
    const { agentSteps, messages } = useChatStore();
    const flowChartRef = useRef(null);

    // 가장 최근 응답에서 신뢰도 추출
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    const overallConfidence = lastAssistantMessage?.confidence || 0;

    // 실행 순서 추출
    const executionOrder = agentSteps.map(s => s.agent_name);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">📊 분석 대시보드</h1>
                    <p className="text-gray-400 text-sm">에이전트 분석 결과 시각화</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-400">
                        분석된 에이전트: <span className="text-white font-medium">{agentSteps.length}개</span>
                    </div>
                </div>
            </div>

            {agentSteps.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                    <div className="text-6xl mb-4">📈</div>
                    <h2 className="text-xl font-semibold text-white mb-2">분석 결과가 없습니다</h2>
                    <p className="text-gray-400">
                        채팅 페이지에서 질문을 입력하면 분석 결과가 여기에 시각화됩니다.
                    </p>
                </div>
            ) : (
                <>
                    {/* Top Row - Flow Chart & Confidence */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-3">
                            <ChartContainer title="🔄 에이전트 실행 플로우" filename="agent-flow">
                                <AgentFlowChart
                                    agentSteps={agentSteps}
                                    executionOrder={executionOrder}
                                />
                            </ChartContainer>
                        </div>
                        <div className="flex flex-col gap-4">
                            <ConfidenceGauge confidence={overallConfidence} size="large" />
                            <ExecutionTimeline agentSteps={agentSteps} />
                        </div>
                    </div>

                    {/* Middle Row - Scenario & Risk */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartContainer title="📊 시나리오 비교" filename="scenario-compare">
                            <ScenarioCompareChart />
                        </ChartContainer>
                        <ChartContainer title="⚠️ 리스크 분석" filename="risk-heatmap">
                            <RiskHeatmap />
                        </ChartContainer>
                    </div>

                    {/* Agent Results Table */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-white mb-4">📋 에이전트별 상세 결과</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-2 px-3 text-gray-400 font-medium">에이전트</th>
                                        <th className="text-left py-2 px-3 text-gray-400 font-medium">신뢰도</th>
                                        <th className="text-left py-2 px-3 text-gray-400 font-medium">소요시간</th>
                                        <th className="text-left py-2 px-3 text-gray-400 font-medium">결과 요약</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agentSteps.map((step, idx) => (
                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-2">
                                                    <span>{getAgentEmoji(step.agent_name)}</span>
                                                    <span className="text-white">{getAgentLabel(step.agent_name)}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                                                            style={{ width: `${(step.confidence || 0) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-gray-300">{Math.round((step.confidence || 0) * 100)}%</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-gray-300">{step.duration_ms}ms</td>
                                            <td className="py-3 px-3 text-gray-400 max-w-md truncate">
                                                {step.result?.slice(0, 100)}...
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Helper functions
function getAgentEmoji(name) {
    const emojis = {
        law_expert: '📜',
        calculator: '🧮',
        risk_analyst: '⚠️',
        strategist: '🎯',
    };
    return emojis[name] || '🤖';
}

function getAgentLabel(name) {
    const labels = {
        law_expert: '법령 전문가',
        calculator: '계산 전문가',
        risk_analyst: '리스크 분석',
        strategist: '전략가',
    };
    return labels[name] || name;
}

export default AnalysisDashboardPage;
