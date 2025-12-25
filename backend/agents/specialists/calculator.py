"""
CalculatorAgent - 계산 전문가 에이전트

세금 계산 및 시뮬레이션을 담당하는 전문가 에이전트.
"""
from typing import Dict, Any
from ..base import BaseAgent, AgentInput, AgentOutput, Visualization
from ..registry import AgentRegistry


@AgentRegistry.register("calculator", config={
    "description": "세금 계산 및 시뮬레이션 전문가",
    "temperature": 0.1,
})
class CalculatorAgent(BaseAgent):
    """
    계산 전문가 에이전트
    
    Responsibilities:
    - 세금 계산 (종합소득세, 부가세 등)
    - 시나리오 시뮬레이션
    - 비교 분석
    """
    
    def __init__(
        self, 
        name: str = "calculator",
        description: str = "세금 계산 및 시뮬레이션 전문가",
        llm_service = None,
        config: Dict[str, Any] = None
    ):
        super().__init__(name, description, llm_service, config)
    
    def get_system_prompt(self) -> str:
        return """당신은 세금 계산 전문가입니다.
정확한 세금 계산과 시뮬레이션을 수행합니다.

규칙:
- 계산 과정을 단계별로 명시
- 가정이 필요한 경우 명확히 표시
- 여러 시나리오 비교 제시
- 모든 금액은 원단위, 천단위 콤마로 표시

출력 형식:
## 🧮 세금 계산 분석

### 계산 전제
[가정 사항 및 입력값]

### 계산 과정
| 항목 | 금액 | 비고 |
|------|------|------|
| ... | ... | ... |

### 결과 요약
[최종 세액 및 환급/납부액]

### 시나리오 비교
[대안 비교 (해당 시)]
"""
    
    async def execute(self, input: AgentInput) -> AgentOutput:
        """세금 계산 실행"""
        if not self.llm:
            return AgentOutput(
                agent_name=self.name,
                result="LLM 서비스가 설정되지 않았습니다.",
                confidence=0.0,
                reasoning="LLM service not configured"
            )
        
        # 이전 법령 분석 결과 참조
        law_context = ""
        if input.previous_results:
            for prev in input.previous_results:
                if prev.get("agent_name") == "law_expert":
                    law_context = prev.get("result", "")[:1000]
                    break
        
        user_prompt = f"""다음 질문에 대해 세금 계산을 수행해주세요.

질문: {input.query}

{f'법령 분석 결과 참고:{law_context}' if law_context else ''}

정확한 계산 과정과 함께 결과를 제시해주세요.
가정이 필요한 경우 명확히 명시하고, 가능하면 여러 시나리오를 비교해주세요."""
        
        try:
            result = await self.llm.chat(
                system_prompt=self.get_system_prompt(),
                user_message=user_prompt
            )
            
            # 시나리오 비교 시각화 데이터 생성 (예시)
            visualizations = []
            
            # 법인전환 관련 질문인 경우 비교 차트 생성
            if "법인" in input.query or "개인" in input.query or "비교" in input.query:
                visualizations.append(Visualization(
                    type="compare",
                    title="세금 부담 비교",
                    data=[
                        {"name": "개인사업 유지", "종합소득세": 3500, "건강보험": 400, "국민연금": 200, "total": 4100},
                        {"name": "법인 전환", "법인세": 1200, "급여소득세": 1500, "배당세": 500, "건보료": 300, "total": 3500},
                    ],
                    insight="법인 전환 시 연간 약 600만원 절세 효과 (수익 1억 기준)"
                ))
            
            return AgentOutput(
                agent_name=self.name,
                result=result,
                confidence=0.90,
                reasoning="세금 계산 및 시뮬레이션 완료",
                sources=[{"type": "calculation", "query": input.query}],
                metadata={"agent_type": "calculator"},
                visualizations=visualizations
            )
            
        except Exception as e:
            return AgentOutput(
                agent_name=self.name,
                result=f"세금 계산 중 오류 발생: {str(e)}",
                confidence=0.0,
                reasoning=f"Error: {str(e)}",
                metadata={"error": True}
            )

