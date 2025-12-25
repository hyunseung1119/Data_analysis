import { useCallback, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom node component for agents
function AgentNode({ data }) {
    const statusColors = {
        completed: 'border-green-500 bg-green-500/10',
        running: 'border-blue-500 bg-blue-500/10 animate-pulse',
        waiting: 'border-gray-500 bg-gray-500/10',
        error: 'border-red-500 bg-red-500/10',
    };

    const agentColors = {
        orchestrator: '#8b5cf6',
        law_expert: '#10b981',
        calculator: '#3b82f6',
        risk_analyst: '#f59e0b',
        strategist: '#ec4899',
    };

    const agentEmojis = {
        orchestrator: '🧠',
        law_expert: '📜',
        calculator: '🧮',
        risk_analyst: '⚠️',
        strategist: '🎯',
    };

    return (
        <div
            className={`px-4 py-3 rounded-xl border-2 ${statusColors[data.status] || statusColors.waiting} min-w-[120px]`}
            style={{ borderColor: agentColors[data.type] || '#6b7280' }}
        >
            <div className="flex items-center gap-2">
                <span className="text-lg">{agentEmojis[data.type] || '🤖'}</span>
                <div>
                    <div className="text-sm font-medium text-white">{data.label}</div>
                    {data.confidence !== undefined && (
                        <div className="text-xs text-gray-400">
                            신뢰도: {Math.round(data.confidence * 100)}%
                        </div>
                    )}
                    {data.duration !== undefined && (
                        <div className="text-xs text-gray-500">{data.duration}ms</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Custom node types
const nodeTypes = {
    agent: AgentNode,
};

/**
 * Agent Flow Chart - 에이전트 실행 흐름 시각화
 */
function AgentFlowChart({ agentSteps = [], executionOrder = [], isLoading = false }) {
    // Generate nodes from agent steps
    const nodes = useMemo(() => {
        const baseNodes = [
            {
                id: 'user',
                type: 'input',
                data: { label: '👤 사용자 질문' },
                position: { x: 250, y: 0 },
                style: {
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 20px',
                },
            },
            {
                id: 'orchestrator',
                type: 'agent',
                data: {
                    label: '오케스트레이터',
                    type: 'orchestrator',
                    status: executionOrder.length > 0 ? 'completed' : isLoading ? 'running' : 'waiting',
                },
                position: { x: 250, y: 80 },
            },
        ];

        // Add agent nodes based on execution order
        const agentNodes = executionOrder.map((agentName, idx) => {
            const step = agentSteps.find(s => s.agent_name === agentName);
            const xOffset = (idx - (executionOrder.length - 1) / 2) * 180;

            return {
                id: agentName,
                type: 'agent',
                data: {
                    label: getAgentLabel(agentName),
                    type: agentName,
                    status: step ? 'completed' : isLoading ? 'running' : 'waiting',
                    confidence: step?.confidence,
                    duration: step?.duration_ms,
                },
                position: { x: 250 + xOffset, y: 200 },
            };
        });

        // Add final report node
        const reportNode = {
            id: 'report',
            type: 'output',
            data: { label: '📊 종합 리포트' },
            position: { x: 250, y: 320 },
            style: {
                background: agentSteps.length > 0
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : '#374151',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 20px',
            },
        };

        return [...baseNodes, ...agentNodes, reportNode];
    }, [agentSteps, executionOrder, isLoading]);

    // Generate edges
    const edges = useMemo(() => {
        const baseEdges = [
            {
                id: 'user-orchestrator',
                source: 'user',
                target: 'orchestrator',
                animated: isLoading,
                style: { stroke: '#8b5cf6' },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
            },
        ];

        // Edges from orchestrator to agents
        const orchestratorToAgents = executionOrder.map(agentName => ({
            id: `orchestrator-${agentName}`,
            source: 'orchestrator',
            target: agentName,
            animated: isLoading && !agentSteps.find(s => s.agent_name === agentName),
            style: { stroke: getAgentColor(agentName) },
            markerEnd: { type: MarkerType.ArrowClosed, color: getAgentColor(agentName) },
        }));

        // Edges from agents to report
        const agentsToReport = executionOrder.map(agentName => ({
            id: `${agentName}-report`,
            source: agentName,
            target: 'report',
            animated: false,
            style: { stroke: getAgentColor(agentName), opacity: 0.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: getAgentColor(agentName) },
        }));

        return [...baseEdges, ...orchestratorToAgents, ...agentsToReport];
    }, [executionOrder, agentSteps, isLoading]);

    const [nodesState, setNodes, onNodesChange] = useNodesState(nodes);
    const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges);

    // Update nodes when data changes
    useMemo(() => {
        setNodes(nodes);
        setEdges(edges);
    }, [nodes, edges, setNodes, setEdges]);

    return (
        <div className="h-[400px] bg-gray-900/50 rounded-xl border border-white/10">
            <ReactFlow
                nodes={nodesState}
                edges={edgesState}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-left"
            >
                <Background color="#374151" gap={16} />
                <Controls className="!bg-gray-800 !border-gray-700" />
                <MiniMap
                    nodeColor={(node) => getAgentColor(node.data?.type) || '#6b7280'}
                    className="!bg-gray-800"
                />
            </ReactFlow>
        </div>
    );
}

// Helper functions
function getAgentLabel(name) {
    const labels = {
        law_expert: '법령 전문가',
        calculator: '계산 전문가',
        risk_analyst: '리스크 분석',
        strategist: '전략가',
    };
    return labels[name] || name;
}

function getAgentColor(name) {
    const colors = {
        orchestrator: '#8b5cf6',
        law_expert: '#10b981',
        calculator: '#3b82f6',
        risk_analyst: '#f59e0b',
        strategist: '#ec4899',
    };
    return colors[name] || '#6b7280';
}

export default AgentFlowChart;
