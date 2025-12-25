"""
DataAnalystAgent - 데이터 분석 전문가 에이전트

CSV 데이터 자동 분석, 상관관계, A/B 테스트 등을 담당.
"""
import io
import json
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from scipy import stats

from ..base import BaseAgent, AgentInput, AgentOutput, Visualization
from ..registry import AgentRegistry


@AgentRegistry.register("data_analyst", config={
    "description": "CSV 데이터 자동 분석 전문가",
    "temperature": 0.2,
})
class DataAnalystAgent(BaseAgent):
    """
    데이터 분석 전문가 에이전트
    
    Capabilities:
    - CSV 자동 프로파일링
    - 상관관계 분석
    - A/B 테스트
    - 기술 통계
    - 인사이트 생성
    """
    
    def __init__(
        self, 
        name: str = "data_analyst",
        description: str = "CSV 데이터 자동 분석 전문가",
        llm_service = None,
        config: Dict[str, Any] = None
    ):
        super().__init__(name, description, llm_service, config)
        self._current_df: Optional[pd.DataFrame] = None
    
    def get_system_prompt(self) -> str:
        return """당신은 데이터 분석 전문가입니다.
CSV 데이터를 분석하고 인사이트를 도출합니다.

규칙:
- 데이터 품질 문제 식별
- 주요 패턴과 상관관계 발견
- 실행 가능한 인사이트 제공
- 시각화 권장사항 제시

출력 형식:
## 📊 데이터 분석 결과

### 데이터 개요
| 항목 | 값 |
|------|-----|
| 행 수 | ... |
| 열 수 | ... |
| 결측치 | ... |

### 주요 발견사항
1. [발견사항 1]
2. [발견사항 2]

### 상관관계 분석
[강한 상관관계 설명]

### 인사이트 및 권장사항
[실행 가능한 제안]
"""
    
    async def execute(self, input: AgentInput) -> AgentOutput:
        """데이터 분석 실행"""
        visualizations = []
        
        # CSV 데이터가 컨텍스트에 있는지 확인
        csv_data = input.context.get("csv_data")
        file_path = input.context.get("file_path")
        
        if csv_data or file_path:
            # CSV 로드 및 분석
            try:
                if csv_data:
                    self._current_df = pd.read_csv(io.StringIO(csv_data))
                elif file_path:
                    self._current_df = pd.read_csv(file_path)
                
                # 기본 프로파일링
                profile = self._profile_data(self._current_df)
                
                # 상관관계 분석
                correlation = self._analyze_correlation(self._current_df)
                
                # 시각화 데이터 생성
                if correlation:
                    visualizations.append(Visualization(
                        type="heatmap",
                        title="상관관계 히트맵",
                        data=correlation["matrix_data"],
                        insight=correlation["insight"]
                    ))
                
                # 분포 시각화
                dist_viz = self._create_distribution_viz(self._current_df)
                if dist_viz:
                    visualizations.append(dist_viz)
                
                # LLM으로 인사이트 생성
                if self.llm:
                    insight_prompt = f"""다음 데이터 프로파일을 분석하고 인사이트를 제공해주세요:

{json.dumps(profile, indent=2, ensure_ascii=False)}

상관관계 분석:
{json.dumps(correlation, indent=2, ensure_ascii=False) if correlation else '수치형 데이터 없음'}

사용자 질문: {input.query}
"""
                    result = await self.llm.chat(
                        system_prompt=self.get_system_prompt(),
                        user_message=insight_prompt
                    )
                else:
                    result = self._generate_basic_report(profile, correlation)
                
                return AgentOutput(
                    agent_name=self.name,
                    result=result,
                    confidence=0.85,
                    reasoning="CSV 데이터 자동 분석 완료",
                    metadata={
                        "rows": len(self._current_df),
                        "columns": len(self._current_df.columns),
                        "profile": profile
                    },
                    visualizations=visualizations
                )
                
            except Exception as e:
                return AgentOutput(
                    agent_name=self.name,
                    result=f"데이터 분석 중 오류: {str(e)}",
                    confidence=0.0,
                    reasoning=str(e)
                )
        
        # CSV 데이터 없이 일반 분석 질문
        if self.llm:
            result = await self.llm.chat(
                system_prompt=self.get_system_prompt(),
                user_message=f"다음 질문에 대해 데이터 분석 관점에서 답변해주세요:\n\n{input.query}"
            )
            return AgentOutput(
                agent_name=self.name,
                result=result,
                confidence=0.75,
                reasoning="일반 데이터 분석 조언 제공"
            )
        
        return AgentOutput(
            agent_name=self.name,
            result="CSV 파일을 업로드하거나 데이터 분석 관련 질문을 해주세요.",
            confidence=0.5,
            reasoning="데이터 없음"
        )
    
    def _profile_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """기본 데이터 프로파일링"""
        profile = {
            "shape": {"rows": len(df), "columns": len(df.columns)},
            "columns": [],
            "missing_values": {},
            "data_quality": {}
        }
        
        for col in df.columns:
            col_info = {
                "name": col,
                "dtype": str(df[col].dtype),
                "missing": int(df[col].isna().sum()),
                "missing_pct": round(df[col].isna().mean() * 100, 2),
                "unique": int(df[col].nunique())
            }
            
            if pd.api.types.is_numeric_dtype(df[col]):
                col_info.update({
                    "mean": round(df[col].mean(), 2) if not df[col].isna().all() else None,
                    "std": round(df[col].std(), 2) if not df[col].isna().all() else None,
                    "min": round(df[col].min(), 2) if not df[col].isna().all() else None,
                    "max": round(df[col].max(), 2) if not df[col].isna().all() else None,
                })
            
            profile["columns"].append(col_info)
            
            if col_info["missing"] > 0:
                profile["missing_values"][col] = col_info["missing_pct"]
        
        # 데이터 품질 경고
        warnings = []
        if df.duplicated().sum() > 0:
            warnings.append(f"중복 행 {df.duplicated().sum()}개 발견")
        
        high_missing = [c for c in profile["columns"] if c["missing_pct"] > 20]
        if high_missing:
            warnings.append(f"결측치 20% 초과 컬럼: {[c['name'] for c in high_missing]}")
        
        profile["data_quality"]["warnings"] = warnings
        
        return profile
    
    def _analyze_correlation(self, df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """상관관계 분석"""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if len(numeric_cols) < 2:
            return None
        
        corr_matrix = df[numeric_cols].corr()
        
        # 강한 상관관계 추출
        strong_correlations = []
        for i, col1 in enumerate(numeric_cols):
            for j, col2 in enumerate(numeric_cols):
                if i < j:
                    corr_val = corr_matrix.loc[col1, col2]
                    if abs(corr_val) > 0.7:
                        strong_correlations.append({
                            "pair": [col1, col2],
                            "correlation": round(corr_val, 3),
                            "strength": "강한 양의 상관" if corr_val > 0 else "강한 음의 상관"
                        })
        
        # 히트맵용 데이터 변환
        matrix_data = []
        for col in numeric_cols:
            row_data = {"id": col}
            for col2 in numeric_cols:
                row_data[col2] = round(corr_matrix.loc[col, col2], 2)
            matrix_data.append(row_data)
        
        insight = ""
        if strong_correlations:
            pairs = [f"{c['pair'][0]} ↔ {c['pair'][1]} (r={c['correlation']})" for c in strong_correlations[:3]]
            insight = f"강한 상관관계 발견: {', '.join(pairs)}"
        
        return {
            "matrix_data": matrix_data,
            "strong_correlations": strong_correlations,
            "insight": insight
        }
    
    def _create_distribution_viz(self, df: pd.DataFrame) -> Optional[Visualization]:
        """분포 시각화 데이터 생성"""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if not numeric_cols:
            return None
        
        # 첫 번째 수치형 컬럼의 분포
        col = numeric_cols[0]
        data = df[col].dropna()
        
        # 히스토그램 데이터
        hist, bin_edges = np.histogram(data, bins=10)
        hist_data = [
            {"bin": f"{bin_edges[i]:.1f}-{bin_edges[i+1]:.1f}", "count": int(hist[i])}
            for i in range(len(hist))
        ]
        
        return Visualization(
            type="bar",
            title=f"{col} 분포",
            data=hist_data,
            insight=f"평균: {data.mean():.2f}, 표준편차: {data.std():.2f}"
        )
    
    def _generate_basic_report(self, profile: Dict, correlation: Optional[Dict]) -> str:
        """기본 분석 리포트 생성"""
        report = f"""## 📊 데이터 분석 결과

### 데이터 개요
| 항목 | 값 |
|:-----|:---|
| 행 수 | {profile['shape']['rows']:,} |
| 열 수 | {profile['shape']['columns']} |
| 결측치 있는 컬럼 | {len(profile['missing_values'])}개 |

### 컬럼 정보
| 컬럼명 | 타입 | 결측치(%) | 고유값 |
|:------|:-----|--------:|------:|
"""
        for col in profile['columns'][:10]:
            report += f"| {col['name']} | {col['dtype']} | {col['missing_pct']}% | {col['unique']} |\n"
        
        if profile['data_quality']['warnings']:
            report += "\n### ⚠️ 데이터 품질 경고\n"
            for w in profile['data_quality']['warnings']:
                report += f"- {w}\n"
        
        if correlation and correlation['strong_correlations']:
            report += "\n### 📈 상관관계 분석\n"
            for c in correlation['strong_correlations'][:5]:
                emoji = "⬆️" if c['correlation'] > 0 else "⬇️"
                report += f"- {c['pair'][0]} ↔ {c['pair'][1]}: r={c['correlation']} {emoji}\n"
        
        return report
    
    async def perform_ab_test(
        self, 
        df: pd.DataFrame,
        group_col: str,
        metric_col: str,
        alpha: float = 0.05
    ) -> Dict[str, Any]:
        """A/B 테스트 수행"""
        groups = df[group_col].unique()
        
        if len(groups) != 2:
            return {"error": "A/B 테스트에는 정확히 2개 그룹이 필요합니다."}
        
        group_a = df[df[group_col] == groups[0]][metric_col].dropna()
        group_b = df[df[group_col] == groups[1]][metric_col].dropna()
        
        # t-test
        t_stat, p_value = stats.ttest_ind(group_a, group_b)
        
        # 효과 크기 (Cohen's d)
        pooled_std = np.sqrt((group_a.std()**2 + group_b.std()**2) / 2)
        effect_size = (group_b.mean() - group_a.mean()) / pooled_std if pooled_std > 0 else 0
        
        is_significant = p_value < alpha
        
        return {
            "group_a": {"name": str(groups[0]), "mean": group_a.mean(), "n": len(group_a)},
            "group_b": {"name": str(groups[1]), "mean": group_b.mean(), "n": len(group_b)},
            "t_statistic": t_stat,
            "p_value": p_value,
            "effect_size": effect_size,
            "is_significant": is_significant,
            "conclusion": f"통계적으로 {'유의함 ✅' if is_significant else '유의하지 않음 ⚠️'} (p={p_value:.4f})"
        }
