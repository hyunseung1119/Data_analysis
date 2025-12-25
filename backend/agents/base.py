"""
BaseAgent - Abstract base class for all agents

모든 에이전트가 상속받는 추상 기본 클래스.
Single Responsibility: 각 에이전트는 하나의 전문 역할만 담당
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class AgentInput(BaseModel):
    """에이전트 입력 모델"""
    query: str = Field(..., description="사용자 질문")
    context: Dict[str, Any] = Field(default_factory=dict, description="추가 컨텍스트")
    previous_results: List[Dict[str, Any]] = Field(
        default_factory=list, 
        description="이전 에이전트들의 결과"
    )
    session_id: Optional[str] = Field(default=None, description="세션 ID")


class Visualization(BaseModel):
    """시각화 데이터 모델"""
    type: str = Field(..., description="차트 타입: bar, pie, line, heatmap, table, compare")
    title: str = Field(..., description="차트 제목")
    data: List[Dict[str, Any]] = Field(default_factory=list, description="차트 데이터")
    insight: str = Field(default="", description="차트 인사이트 설명")


class AgentOutput(BaseModel):
    """에이전트 출력 모델"""
    agent_name: str = Field(..., description="에이전트 이름")
    result: str = Field(..., description="분석 결과")
    confidence: float = Field(default=0.8, ge=0.0, le=1.0, description="신뢰도 (0~1)")
    reasoning: str = Field(default="", description="추론 과정")
    sources: List[Dict[str, Any]] = Field(default_factory=list, description="참조 소스")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="메타데이터")
    duration_ms: int = Field(default=0, description="실행 시간 (ms)")
    timestamp: datetime = Field(default_factory=datetime.now, description="실행 시각")
    visualizations: List[Visualization] = Field(default_factory=list, description="시각화 데이터")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class BaseAgent(ABC):
    """
    모든 에이전트의 기본 클래스
    
    Attributes:
        name: 에이전트 고유 이름
        description: 에이전트 설명
        llm: LLM 서비스 인스턴스
        config: 에이전트 설정
    """
    
    def __init__(
        self, 
        name: str, 
        description: str, 
        llm_service = None,
        config: Dict[str, Any] = None
    ):
        self.name = name
        self.description = description
        self.llm = llm_service
        self.config = config or {}
        self._tools: List[Any] = []
        self._is_initialized = False
    
    @abstractmethod
    async def execute(self, input: AgentInput) -> AgentOutput:
        """
        에이전트 실행 (필수 구현)
        
        Args:
            input: AgentInput 모델
            
        Returns:
            AgentOutput 모델
        """
        pass
    
    @abstractmethod
    def get_system_prompt(self) -> str:
        """
        에이전트별 시스템 프롬프트 반환 (필수 구현)
        
        Returns:
            시스템 프롬프트 문자열
        """
        pass
    
    def register_tool(self, tool: Any) -> None:
        """도구 등록"""
        self._tools.append(tool)
    
    def get_tools(self) -> List[Any]:
        """등록된 도구 목록 반환"""
        return self._tools.copy()
    
    async def initialize(self) -> None:
        """에이전트 초기화 (선택적 오버라이드)"""
        self._is_initialized = True
    
    @property
    def is_initialized(self) -> bool:
        """초기화 상태 확인"""
        return self._is_initialized
    
    def get_info(self) -> Dict[str, Any]:
        """에이전트 정보 반환"""
        return {
            "name": self.name,
            "description": self.description,
            "tools": [str(t) for t in self._tools],
            "is_initialized": self._is_initialized,
            "config": self.config,
        }
    
    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}(name={self.name})>"
