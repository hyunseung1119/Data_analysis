"""
LawExpertAgent - 법령 전문가 에이전트

법령 검색 및 해석을 담당하는 전문가 에이전트.
RAG 기반으로 관련 법령을 찾고 해석합니다.
"""
from typing import Dict, Any
from ..base import BaseAgent, AgentInput, AgentOutput
from ..registry import AgentRegistry


@AgentRegistry.register("law_expert", config={
    "description": "법령 검색 및 해석 전문가",
    "temperature": 0.2,
})
class LawExpertAgent(BaseAgent):
    """
    법령 전문가 에이전트
    
    Responsibilities:
    - 관련 법령 검색 (RAG)
    - 조문 해석 및 인용
    - 판례/해석 사례 참조
    """
    
    def __init__(
        self, 
        name: str = "law_expert",
        description: str = "법령 검색 및 해석 전문가",
        llm_service = None,
        config: Dict[str, Any] = None
    ):
        super().__init__(name, description, llm_service, config)
    
    def get_system_prompt(self) -> str:
        return """당신은 대한민국 세법 전문가입니다.
관련 법령을 검색하고 정확한 조문을 인용하여 법적 근거를 제시합니다.

규칙:
- 항상 법령 근거를 명시 (예: 소득세법 제XX조)
- 불확실한 내용은 "확인 필요"로 표기
- 최신 법령 기준으로 답변
- 판례나 해석 사례가 있으면 함께 인용

출력 형식:
## 📜 법령 분석

### 관련 법령
[법령 목록 및 조문 번호]

### 핵심 내용
[요약 설명]

### 적용 조건
[조건 및 요건 설명]

### 주의사항
[주의해야 할 점]
"""
    
    async def execute(self, input: AgentInput) -> AgentOutput:
        """법령 분석 실행"""
        if not self.llm:
            return AgentOutput(
                agent_name=self.name,
                result="LLM 서비스가 설정되지 않았습니다.",
                confidence=0.0,
                reasoning="LLM service not configured"
            )
        
        # 이전 결과 컨텍스트 구성
        previous_context = ""
        if input.previous_results:
            for prev in input.previous_results:
                previous_context += f"\n[{prev.get('agent_name', 'Unknown')}]: {prev.get('result', '')[:500]}"
        
        # 사용자 프롬프트 구성
        user_prompt = f"""다음 질문에 대해 관련 법령을 분석해주세요.

질문: {input.query}

{f'이전 분석 결과:{previous_context}' if previous_context else ''}

법령 근거와 함께 상세히 분석해주세요."""
        
        try:
            result = await self.llm.chat(
                system_prompt=self.get_system_prompt(),
                user_message=user_prompt
            )
            
            return AgentOutput(
                agent_name=self.name,
                result=result,
                confidence=0.85,
                reasoning="법령 검색 및 조문 분석 완료",
                sources=[{"type": "law_analysis", "query": input.query}],
                metadata={"agent_type": "law_expert"}
            )
            
        except Exception as e:
            return AgentOutput(
                agent_name=self.name,
                result=f"법령 분석 중 오류 발생: {str(e)}",
                confidence=0.0,
                reasoning=f"Error: {str(e)}",
                metadata={"error": True}
            )
