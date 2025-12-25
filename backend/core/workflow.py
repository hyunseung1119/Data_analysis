"""
MultiAgentWorkflow - LangGraph Workflow Definition

LangGraph 기반 멀티에이전트 워크플로우 구성.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
from typing import Dict, Any, Optional
from langgraph.graph import StateGraph, END

from core.state import MultiAgentState, create_initial_state
from agents.registry import AgentRegistry
from agents.base import AgentInput
from services.llm_service import LLMService


class MultiAgentWorkflow:
    """
    LangGraph 기반 멀티에이전트 워크플로우
    
    각 에이전트가 노드로 동작하고, 오케스트레이터가 라우팅을 결정함.
    """
    
    def __init__(self, llm_service: LLMService = None):
        self.llm = llm_service or LLMService()
        self.graph = self._build_graph()
        self.compiled = self.graph.compile()
    
    def _build_graph(self) -> StateGraph:
        """워크플로우 그래프 구성"""
        workflow = StateGraph(MultiAgentState)
        
        # 노드 추가
        workflow.add_node("analyze", self._analyze_node)
        workflow.add_node("execute_agent", self._execute_agent_node)
        workflow.add_node("synthesize", self._synthesize_node)
        
        # 엣지 연결
        workflow.set_entry_point("analyze")
        workflow.add_edge("analyze", "execute_agent")
        workflow.add_conditional_edges(
            "execute_agent",
            self._should_continue,
            {
                "continue": "execute_agent",
                "synthesize": "synthesize",
            }
        )
        workflow.add_edge("synthesize", END)
        
        return workflow
    
    async def _analyze_node(self, state: MultiAgentState) -> Dict[str, Any]:
        """요청 분석 노드 - 실행할 에이전트 결정"""
        query = state["query"]
        query_lower = query.lower()
        
        # 등록된 에이전트 목록
        available = AgentRegistry.list_agents()
        
        if not available:
            return {"execution_order": [], "error": "등록된 에이전트가 없습니다."}
        
        # 키워드 기반 에이전트 선택
        selected = []
        
        keywords_map = {
            "law_expert": ["법", "조문", "규정", "법령", "시행령", "세법"],
            "calculator": ["계산", "세금", "세액", "얼마", "금액", "비교", "시뮬"],
            "risk_analyst": ["리스크", "위험", "조사", "문제", "주의", "감사"],
            "strategist": ["전략", "방법", "어떻게", "추천", "유리", "vs", "선택"],
        }
        
        for agent_name, keywords in keywords_map.items():
            if agent_name in available and any(kw in query_lower for kw in keywords):
                selected.append(agent_name)
        
        # 선택 없으면 기본
        if not selected:
            default_order = ["law_expert", "calculator", "risk_analyst", "strategist"]
            selected = [a for a in default_order if a in available]
        
        # 전략가가 없으면 마지막에 추가 (종합 분석용)
        if "strategist" in available and "strategist" not in selected and len(selected) > 1:
            selected.append("strategist")
        
        return {
            "execution_order": selected,
            "current_agent_idx": 0,
        }
    
    async def _execute_agent_node(self, state: MultiAgentState) -> Dict[str, Any]:
        """에이전트 실행 노드"""
        execution_order = state["execution_order"]
        current_idx = state["current_agent_idx"]
        
        if current_idx >= len(execution_order):
            return {}
        
        agent_name = execution_order[current_idx]
        
        try:
            # 에이전트 가져오기
            agent = AgentRegistry.get(agent_name, llm_service=self.llm)
            
            # 입력 구성
            agent_input = AgentInput(
                query=state["query"],
                context=state["user_context"],
                previous_results=state["agent_results"],
            )
            
            # 실행
            start_time = time.time()
            output = await agent.execute(agent_input)
            duration_ms = int((time.time() - start_time) * 1000)
            
            # 결과 추가
            new_result = {
                "agent_name": output.agent_name,
                "result": output.result,
                "confidence": output.confidence,
                "reasoning": output.reasoning,
                "sources": output.sources,
                "duration_ms": duration_ms,
                "visualizations": [v.model_dump() for v in output.visualizations] if output.visualizations else [],
            }
            
            return {
                "agent_results": state["agent_results"] + [new_result],
                "current_agent_idx": current_idx + 1,
            }
            
        except Exception as e:
            error_result = {
                "agent_name": agent_name,
                "result": f"에이전트 실행 실패: {str(e)}",
                "confidence": 0.0,
                "reasoning": str(e),
                "sources": [],
                "duration_ms": 0,
            }
            return {
                "agent_results": state["agent_results"] + [error_result],
                "current_agent_idx": current_idx + 1,
            }
    
    def _should_continue(self, state: MultiAgentState) -> str:
        """다음 단계 결정 - 계속 실행할지 종합 단계로 갈지"""
        current_idx = state["current_agent_idx"]
        execution_order = state["execution_order"]
        
        if current_idx < len(execution_order):
            return "continue"
        return "synthesize"
    
    async def _synthesize_node(self, state: MultiAgentState) -> Dict[str, Any]:
        """결과 종합 노드"""
        results = state["agent_results"]
        query = state["query"]
        
        if not results:
            return {
                "final_report": "분석 결과가 없습니다.",
                "overall_confidence": 0.0,
                "is_complete": True,
            }
        
        # 신뢰도 계산
        valid_results = [r for r in results if r["confidence"] > 0]
        avg_confidence = sum(r["confidence"] for r in valid_results) / len(valid_results) if valid_results else 0.5
        
        # 리포트 생성
        report_parts = []
        report_parts.append("# 📊 종합 분석 리포트\n\n")
        report_parts.append(f"**질문**: {query}\n\n")
        report_parts.append(f"**분석 에이전트**: {len(results)}개\n")
        report_parts.append(f"**종합 신뢰도**: {avg_confidence:.0%}\n\n")
        report_parts.append("---\n\n")
        
        for result in results:
            emoji = "✅" if result["confidence"] >= 0.7 else "⚠️" if result["confidence"] >= 0.4 else "❌"
            report_parts.append(f"## {emoji} {result['agent_name']}\n\n")
            report_parts.append(f"**신뢰도**: {result['confidence']:.0%} | ")
            report_parts.append(f"**소요시간**: {result['duration_ms']}ms\n\n")
            report_parts.append(f"{result['result']}\n\n")
            report_parts.append("---\n\n")
        
        return {
            "final_report": "".join(report_parts),
            "overall_confidence": avg_confidence,
            "is_complete": True,
        }
    
    async def run(
        self, 
        query: str, 
        context: Dict[str, Any] = None,
        session_id: str = None
    ) -> Dict[str, Any]:
        """
        워크플로우 실행
        
        Args:
            query: 사용자 질문
            context: 추가 컨텍스트
            session_id: 세션 ID
            
        Returns:
            최종 결과 dict
        """
        initial_state = create_initial_state(
            query=query,
            context=context,
            session_id=session_id,
        )
        
        # 비동기 실행
        final_state = await self.compiled.ainvoke(initial_state)
        
        return {
            "report": final_state.get("final_report", ""),
            "confidence": final_state.get("overall_confidence", 0),
            "agent_results": final_state.get("agent_results", []),
            "execution_order": final_state.get("execution_order", []),
            "session_id": session_id,
        }


def build_workflow(llm_service: LLMService = None) -> MultiAgentWorkflow:
    """워크플로우 인스턴스 생성 헬퍼"""
    return MultiAgentWorkflow(llm_service=llm_service)
