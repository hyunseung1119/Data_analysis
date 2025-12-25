"""
Orchestrator - 에이전트 조율자

요청 분석, 에이전트 선택, 실행 조율, 결과 종합을 담당.
"""
import time
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

from .base import BaseAgent, AgentInput, AgentOutput
from .registry import AgentRegistry


class Orchestrator:
    """
    에이전트 오케스트레이터
    
    Responsibilities:
    - 요청 분석 및 필요한 에이전트 결정
    - 에이전트 실행 순서 결정 및 조율
    - 결과 종합 및 최종 리포트 생성
    """
    
    def __init__(
        self, 
        llm_service,
        registry: AgentRegistry = None,
        config: Dict[str, Any] = None
    ):
        self.llm = llm_service
        self.registry = registry or AgentRegistry
        self.config = config or {}
        self.execution_history: List[Dict[str, Any]] = []
        
        # 기본 설정
        self.default_order = self.config.get("default_order", [
            "law_expert", "calculator", "risk_analyst", "strategist"
        ])
        self.max_iterations = self.config.get("max_iterations", 10)
    
    async def analyze_request(self, query: str) -> Dict[str, Any]:
        """
        요청 분석 → 필요한 에이전트 결정
        
        Args:
            query: 사용자 질문
            
        Returns:
            {"agents": [...], "reason": "..."}
        """
        available_agents = self.registry.list_agents()
        
        if not available_agents:
            return {"agents": self.default_order, "reason": "기본 순서 사용 (등록된 에이전트 없음)"}
        
        # 간단한 룰 기반 분류 (LLM 호출 없이)
        # 추후 LLM 기반으로 확장 가능
        query_lower = query.lower()
        
        selected_agents = []
        
        # 법령 관련 키워드
        if any(kw in query_lower for kw in ["법", "조문", "규정", "법령", "시행령"]):
            if "law_expert" in available_agents:
                selected_agents.append("law_expert")
        
        # 계산 관련 키워드
        if any(kw in query_lower for kw in ["계산", "세금", "세액", "얼마", "금액", "비교"]):
            if "calculator" in available_agents:
                selected_agents.append("calculator")
        
        # 리스크 관련 키워드
        if any(kw in query_lower for kw in ["리스크", "위험", "조사", "문제", "주의"]):
            if "risk_analyst" in available_agents:
                selected_agents.append("risk_analyst")
        
        # 전략/종합 관련 키워드
        if any(kw in query_lower for kw in ["전략", "방법", "어떻게", "추천", "유리", "vs"]):
            if "strategist" in available_agents:
                selected_agents.append("strategist")
        
        # 선택된 에이전트가 없으면 기본 순서 사용
        if not selected_agents:
            selected_agents = [a for a in self.default_order if a in available_agents]
        
        # 전략가는 항상 마지막에 추가 (있으면)
        if "strategist" in available_agents and "strategist" not in selected_agents:
            if len(selected_agents) > 1:  # 다른 에이전트가 2개 이상이면
                selected_agents.append("strategist")
        
        return {
            "agents": selected_agents,
            "reason": f"키워드 기반 분석: {', '.join(selected_agents)}"
        }
    
    async def execute_agents(
        self, 
        query: str, 
        agent_names: List[str],
        context: Dict[str, Any] = None,
        parallel: bool = False
    ) -> List[AgentOutput]:
        """
        에이전트들 순차 실행
        
        Args:
            query: 사용자 질문
            agent_names: 실행할 에이전트 이름 목록
            context: 공유 컨텍스트
            parallel: 병렬 실행 여부 (현재 미지원)
            
        Returns:
            AgentOutput 리스트
        """
        results: List[AgentOutput] = []
        shared_context = context or {}
        
        for name in agent_names:
            if not self.registry.is_registered(name):
                continue
            
            try:
                agent = self.registry.get(name, llm_service=self.llm)
                
                # 에이전트 입력 구성
                agent_input = AgentInput(
                    query=query,
                    context=shared_context,
                    previous_results=[r.model_dump() for r in results]
                )
                
                # 실행
                start_time = time.time()
                output = await agent.execute(agent_input)
                output.duration_ms = int((time.time() - start_time) * 1000)
                
                results.append(output)
                
                # 컨텍스트 업데이트
                shared_context[name] = {
                    "result": output.result,
                    "confidence": output.confidence,
                    "sources": output.sources,
                }
                
                # 히스토리 기록
                self.execution_history.append({
                    "agent": name,
                    "timestamp": datetime.now().isoformat(),
                    "duration_ms": output.duration_ms,
                    "confidence": output.confidence,
                })
                
            except Exception as e:
                # 에러 발생 시에도 계속 진행
                error_output = AgentOutput(
                    agent_name=name,
                    result=f"에이전트 실행 실패: {str(e)}",
                    confidence=0.0,
                    reasoning=f"Error: {str(e)}",
                    metadata={"error": True}
                )
                results.append(error_output)
        
        return results
    
    async def synthesize_results(
        self, 
        query: str, 
        results: List[AgentOutput]
    ) -> Dict[str, Any]:
        """
        결과 종합 → 최종 리포트 생성
        
        Args:
            query: 원본 질문
            results: 에이전트 결과 리스트
            
        Returns:
            종합 리포트 dict
        """
        if not results:
            return {
                "report": "분석 결과가 없습니다.",
                "confidence": 0.0,
                "agent_count": 0,
            }
        
        # 신뢰도 계산 (가중 평균)
        valid_results = [r for r in results if r.confidence > 0]
        avg_confidence = sum(r.confidence for r in valid_results) / len(valid_results) if valid_results else 0.5
        
        # 리포트 구성
        report_parts = []
        report_parts.append("## 📊 종합 분석 리포트\n")
        report_parts.append(f"**질문**: {query}\n")
        report_parts.append(f"**분석 에이전트**: {len(results)}개\n")
        report_parts.append(f"**종합 신뢰도**: {avg_confidence:.0%}\n")
        report_parts.append("\n---\n")
        
        for result in results:
            emoji = "✅" if result.confidence >= 0.7 else "⚠️" if result.confidence >= 0.4 else "❌"
            report_parts.append(f"### {emoji} {result.agent_name}\n")
            report_parts.append(f"**신뢰도**: {result.confidence:.0%}\n")
            report_parts.append(f"\n{result.result}\n")
            
            if result.reasoning:
                report_parts.append(f"\n> 💭 **추론 과정**: {result.reasoning[:200]}...\n" if len(result.reasoning) > 200 else f"\n> 💭 **추론 과정**: {result.reasoning}\n")
            
            report_parts.append("\n---\n")
        
        # 모든 소스 수집
        all_sources = []
        for result in results:
            all_sources.extend(result.sources)
        
        return {
            "report": "".join(report_parts),
            "confidence": avg_confidence,
            "agent_count": len(results),
            "agent_results": [r.model_dump() for r in results],
            "sources": all_sources,
            "execution_history": self.execution_history[-len(results):],
        }
    
    async def run(
        self, 
        query: str, 
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        전체 오케스트레이션 실행
        
        Args:
            query: 사용자 질문
            context: 초기 컨텍스트
            
        Returns:
            최종 결과 dict
        """
        # 1. 요청 분석
        analysis = await self.analyze_request(query)
        
        # 2. 에이전트 실행
        results = await self.execute_agents(
            query=query,
            agent_names=analysis["agents"],
            context=context
        )
        
        # 3. 결과 종합
        final_result = await self.synthesize_results(query, results)
        final_result["analysis"] = analysis
        
        return final_result
    
    def get_execution_history(self) -> List[Dict[str, Any]]:
        """실행 히스토리 반환"""
        return self.execution_history.copy()
    
    def clear_history(self) -> None:
        """히스토리 초기화"""
        self.execution_history.clear()
