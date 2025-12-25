"""
StrategistAgent - 전략가 에이전트

모든 분석을 종합하여 최적의 의사결정을 제안하는 전문가 에이전트.
"""
from typing import Dict, Any
from ..base import BaseAgent, AgentInput, AgentOutput
from ..registry import AgentRegistry


@AgentRegistry.register("strategist", config={
    "description": "종합 전략 수립 전문가",
    "temperature": 0.4,
})
class StrategistAgent(BaseAgent):
    """
    전략가 에이전트
    
    Responsibilities:
    - 모든 분석 결과 종합
    - 장단점 비교 평가
    - 최적 의사결정 제안
    - 실행 계획 수립
    """
    
    def __init__(
        self, 
        name: str = "strategist",
        description: str = "종합 전략 수립 전문가",
        llm_service = None,
        config: Dict[str, Any] = None
    ):
        super().__init__(name, description, llm_service, config)
    
    def get_system_prompt(self) -> str:
        return """당신은 세무 전략 전문가입니다.
다른 전문가들의 분석을 종합하여 최적의 의사결정을 제안합니다.

규칙:
- 모든 분석 결과를 종합적으로 검토
- 장단점을 균형있게 평가
- 구체적인 실행 계획 제시
- 우선순위를 명확히 제시

출력 형식:
## 🎯 전략 권고

### 종합 평가
[상황 요약 및 핵심 판단]

### 권고 옵션
| 옵션 | 장점 | 단점 | 추천도 |
|------|------|------|--------|
| ... | ... | ... | ⭐⭐⭐ |

### 최종 추천
**추천 결정**: [결정 내용]
**근거**: [추천 이유]

### 실행 계획
1. [1단계]
2. [2단계]
3. [3단계]

### 주의사항
[실행 시 유의점]
"""
    
    async def execute(self, input: AgentInput) -> AgentOutput:
        """전략 수립 실행"""
        if not self.llm:
            return AgentOutput(
                agent_name=self.name,
                result="LLM 서비스가 설정되지 않았습니다.",
                confidence=0.0,
                reasoning="LLM service not configured"
            )
        
        # 모든 이전 분석 결과 종합
        previous_analyses = []
        for prev in input.previous_results:
            agent_name = prev.get("agent_name", "Unknown")
            confidence = prev.get("confidence", 0)
            result = prev.get("result", "")
            previous_analyses.append(f"""
### {agent_name} (신뢰도: {confidence:.0%})
{result[:1500]}
""")
        
        analyses_text = "\n".join(previous_analyses) if previous_analyses else "이전 분석 결과 없음"
        
        user_prompt = f"""다음 질문에 대해 종합 전략을 수립해주세요.

## 원본 질문
{input.query}

## 전문가 분석 결과
{analyses_text}

위 분석 결과들을 종합하여 최적의 의사결정과 실행 계획을 제안해주세요.
장단점을 균형있게 평가하고, 구체적이고 실행 가능한 권고를 해주세요."""
        
        try:
            result = await self.llm.chat(
                system_prompt=self.get_system_prompt(),
                user_message=user_prompt
            )
            
            # 종합 신뢰도 계산 (이전 분석들의 평균)
            confidences = [p.get("confidence", 0.5) for p in input.previous_results if p.get("confidence")]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.7
            
            return AgentOutput(
                agent_name=self.name,
                result=result,
                confidence=min(0.95, avg_confidence + 0.05),  # 약간 높게 (종합이므로)
                reasoning=f"법령, 계산, 리스크 분석을 종합한 전략 수립 완료 ({len(input.previous_results)}개 분석 참고)",
                sources=[{"type": "strategy", "based_on": len(input.previous_results)}],
                metadata={"agent_type": "strategist", "synthesized_from": len(input.previous_results)}
            )
            
        except Exception as e:
            return AgentOutput(
                agent_name=self.name,
                result=f"전략 수립 중 오류 발생: {str(e)}",
                confidence=0.0,
                reasoning=f"Error: {str(e)}",
                metadata={"error": True}
            )
