"""
Chat Routes - Multi-Agent Chat API Endpoints
"""
import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.workflow import MultiAgentWorkflow
from services.llm_service import LLMService


router = APIRouter()


# Request/Response Models
class ChatRequest(BaseModel):
    """채팅 요청 모델"""
    query: str = Field(..., description="사용자 질문", min_length=1)
    session_id: Optional[str] = Field(default=None, description="세션 ID")
    context: Dict[str, Any] = Field(default_factory=dict, description="추가 컨텍스트")


class VisualizationResponse(BaseModel):
    """시각화 데이터 응답"""
    type: str
    title: str
    data: List[Dict[str, Any]]
    insight: str = ""


class AgentStepResponse(BaseModel):
    """에이전트 단계 응답"""
    agent_name: str
    result: str
    confidence: float
    reasoning: str
    duration_ms: int
    visualizations: List[VisualizationResponse] = Field(default_factory=list)


class ChatResponse(BaseModel):
    """채팅 응답 모델"""
    answer: str = Field(..., description="종합 분석 리포트")
    confidence: float = Field(..., description="전체 신뢰도")
    agent_steps: List[AgentStepResponse] = Field(default_factory=list)
    session_id: str
    execution_order: List[str] = Field(default_factory=list)
    visualizations: List[VisualizationResponse] = Field(default_factory=list)


# Workflow instance (lazy initialization)
_workflow: Optional[MultiAgentWorkflow] = None


def get_workflow() -> MultiAgentWorkflow:
    """워크플로우 인스턴스 반환 (Singleton)"""
    global _workflow
    if _workflow is None:
        llm = LLMService()
        _workflow = MultiAgentWorkflow(llm_service=llm)
    return _workflow


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    멀티에이전트 채팅 엔드포인트
    
    여러 전문가 에이전트가 협업하여 질문에 답변합니다.
    """
    try:
        workflow = get_workflow()
        session_id = request.session_id or str(uuid.uuid4())
        
        # 워크플로우 실행
        result = await workflow.run(
            query=request.query,
            context=request.context,
            session_id=session_id,
        )
        
        # 응답 구성
        agent_steps = []
        all_visualizations = []
        
        for step in result.get("agent_results", []):
            # 에이전트별 시각화 데이터 추출
            step_visualizations = []
            for viz in step.get("visualizations", []):
                viz_response = VisualizationResponse(
                    type=viz.get("type", ""),
                    title=viz.get("title", ""),
                    data=viz.get("data", []),
                    insight=viz.get("insight", "")
                )
                step_visualizations.append(viz_response)
                all_visualizations.append(viz_response)
            
            agent_steps.append(AgentStepResponse(
                agent_name=step.get("agent_name", "Unknown"),
                result=step.get("result", ""),
                confidence=step.get("confidence", 0),
                reasoning=step.get("reasoning", ""),
                duration_ms=step.get("duration_ms", 0),
                visualizations=step_visualizations,
            ))
        
        return ChatResponse(
            answer=result.get("report", "분석 결과가 없습니다."),
            confidence=result.get("confidence", 0),
            agent_steps=agent_steps,
            session_id=session_id,
            execution_order=result.get("execution_order", []),
            visualizations=all_visualizations,
        )
        
    except Exception as e:
        import traceback
        print(f"❌ Chat Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/simple")
async def chat_simple(query: str):
    """간단한 채팅 엔드포인트 (쿼리 파라미터)"""
    request = ChatRequest(query=query)
    return await chat(request)
