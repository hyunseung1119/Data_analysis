"""
MultiAgentState - LangGraph State Definition

LangGraph 워크플로우에서 사용하는 상태 정의.
"""
from typing import TypedDict, List, Dict, Any, Annotated, Optional
from langgraph.graph import add_messages


class AgentResultState(TypedDict):
    """개별 에이전트 결과 상태"""
    agent_name: str
    result: str
    confidence: float
    reasoning: str
    sources: List[Dict[str, Any]]
    duration_ms: int


class MultiAgentState(TypedDict):
    """
    멀티에이전트 워크플로우 상태
    
    LangGraph에서 노드 간 전달되는 상태 정의.
    """
    # 입력
    query: str
    user_context: Dict[str, Any]
    session_id: Optional[str]
    
    # 실행 제어
    execution_order: List[str]
    current_agent_idx: int
    
    # 에이전트 결과들
    agent_results: List[AgentResultState]
    
    # 메시지 히스토리 (LangGraph 내장 기능)
    messages: Annotated[List, add_messages]
    
    # 출력
    final_report: str
    overall_confidence: float
    is_complete: bool
    error: Optional[str]


def create_initial_state(
    query: str, 
    execution_order: List[str] = None,
    context: Dict[str, Any] = None,
    session_id: str = None
) -> MultiAgentState:
    """
    초기 상태 생성
    
    Args:
        query: 사용자 질문
        execution_order: 실행할 에이전트 순서
        context: 추가 컨텍스트
        session_id: 세션 ID
        
    Returns:
        초기화된 MultiAgentState
    """
    return MultiAgentState(
        query=query,
        user_context=context or {},
        session_id=session_id,
        execution_order=execution_order or [],
        current_agent_idx=0,
        agent_results=[],
        messages=[],
        final_report="",
        overall_confidence=0.0,
        is_complete=False,
        error=None,
    )
