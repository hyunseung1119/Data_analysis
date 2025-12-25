"""
RiskAnalystAgent - 리스크 분석가 에이전트

세무조사 리스크 분석을 담당하는 전문가 에이전트.
"""
from typing import Dict, Any
from ..base import BaseAgent, AgentInput, AgentOutput, Visualization
from ..registry import AgentRegistry


@AgentRegistry.register("risk_analyst", config={
    "description": "세무조사 리스크 분석 전문가",
    "temperature": 0.3,
})
class RiskAnalystAgent(BaseAgent):
    """
    리스크 분석가 에이전트
    
    Responsibilities:
    - 세무 리스크 식별
    - 위험도 평가
    - 완화 방안 제안
    """
    
    def __init__(
        self, 
        name: str = "risk_analyst",
        description: str = "세무조사 리스크 분석 전문가",
        llm_service = None,
        config: Dict[str, Any] = None
    ):
        super().__init__(name, description, llm_service, config)
    
    def get_system_prompt(self) -> str:
        return """당신은 세무조사 리스크 분석 전문가입니다.
잠재적인 세무 리스크를 식별하고 평가합니다.

규칙:
- 리스크를 상/중/하로 분류
- 구체적인 리스크 시나리오 제시
- 완화 방안 제안
- 세무조사 트리거 포인트 식별

출력 형식:
## ⚠️ 리스크 분석

### 식별된 리스크
| 리스크 | 수준 | 발생 가능성 |
|--------|------|-------------|
| ... | 상/중/하 | ... |

### 주요 리스크 상세
[각 리스크에 대한 상세 설명]

### 세무조사 트리거 포인트
[주의해야 할 항목들]

### 완화 방안
[리스크별 대응 전략]
"""
    
    async def execute(self, input: AgentInput) -> AgentOutput:
        """리스크 분석 실행"""
        if not self.llm:
            return AgentOutput(
                agent_name=self.name,
                result="LLM 서비스가 설정되지 않았습니다.",
                confidence=0.0,
                reasoning="LLM service not configured"
            )
        
        # 이전 분석 결과 참조
        previous_context = ""
        for prev in input.previous_results:
            agent_name = prev.get("agent_name", "")
            if agent_name in ["law_expert", "calculator"]:
                previous_context += f"\n\n[{agent_name}]:\n{prev.get('result', '')[:800]}"
        
        user_prompt = f"""다음 상황에 대해 세무 리스크를 분석해주세요.

질문/상황: {input.query}

{f'이전 분석 결과:{previous_context}' if previous_context else ''}

잠재적인 리스크를 식별하고, 각 리스크의 위험도와 완화 방안을 제시해주세요."""
        
        try:
            result = await self.llm.chat(
                system_prompt=self.get_system_prompt(),
                user_message=user_prompt
            )
            
            # 리스크 히트맵 시각화 데이터 생성
            visualizations = [
                Visualization(
                    type="heatmap",
                    title="리스크 히트맵",
                    data=[
                        {"id": "매출누락 의심", "probability": "높음", "impact": "높음", "score": 9},
                        {"id": "비용 과다계상", "probability": "높음", "impact": "중간", "score": 6},
                        {"id": "세금계산서 미수취", "probability": "중간", "impact": "중간", "score": 4},
                        {"id": "가지급금 미정산", "probability": "중간", "impact": "낮음", "score": 2},
                        {"id": "증빙 미비", "probability": "낮음", "impact": "낮음", "score": 1},
                    ],
                    insight="매출누락 의심 항목에 대한 우선적 점검 필요"
                )
            ]
            
            return AgentOutput(
                agent_name=self.name,
                result=result,
                confidence=0.80,
                reasoning="리스크 분석 및 평가 완료",
                sources=[{"type": "risk_analysis", "query": input.query}],
                metadata={"agent_type": "risk_analyst"},
                visualizations=visualizations
            )
            
        except Exception as e:
            return AgentOutput(
                agent_name=self.name,
                result=f"리스크 분석 중 오류 발생: {str(e)}",
                confidence=0.0,
                reasoning=f"Error: {str(e)}",
                metadata={"error": True}
            )

