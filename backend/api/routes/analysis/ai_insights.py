"""
AI Insights Module - 상세 AI 기반 데이터 분석 리포트
"""
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
from scipy import stats
from . import get_dataframe

router = APIRouter()

class InsightRequest(BaseModel):
    file_id: str
    analysis_type: str = "comprehensive"
    focus_areas: List[str] = []


@router.post("/analysis/ai-insights")
async def generate_ai_insights(request: InsightRequest):
    """상세 AI 인사이트 리포트 생성"""
    try:
        df = get_dataframe(request.file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    # 상세 분석 수행
    data_summary = _generate_detailed_summary(df)
    statistical_analysis = _run_statistical_analysis(df)
    quality_report = _assess_data_quality(df)
    insights = _generate_detailed_insights(df, statistical_analysis)
    recommendations = _generate_actionable_recommendations(df, statistical_analysis)
    executive_summary = _generate_executive_summary(df, statistical_analysis, insights)
    
    return {
        "file_id": request.file_id,
        "executive_summary": executive_summary,
        "data_summary": data_summary,
        "quality_report": quality_report,
        "statistical_analysis": statistical_analysis,
        "key_insights": insights,
        "recommendations": recommendations,
        "risk_alerts": _identify_detailed_risks(df, statistical_analysis),
        "opportunities": _identify_opportunities(df, statistical_analysis),
        "next_steps": _suggest_next_steps(df, statistical_analysis)
    }


def _generate_detailed_summary(df: pd.DataFrame) -> Dict:
    """상세 데이터 요약"""
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    
    # 수치형 컬럼 통계
    numeric_stats = []
    for col in numeric_cols[:10]:
        data = df[col].dropna()
        if len(data) > 0:
            numeric_stats.append({
                "column": col,
                "mean": round(float(data.mean()), 2),
                "std": round(float(data.std()), 2),
                "min": round(float(data.min()), 2),
                "max": round(float(data.max()), 2),
                "median": round(float(data.median()), 2),
                "skewness": round(float(data.skew()), 3),
                "range": round(float(data.max() - data.min()), 2)
            })
    
    # 범주형 컬럼 분포
    categorical_stats = []
    for col in categorical_cols[:5]:
        vc = df[col].value_counts()
        categorical_stats.append({
            "column": col,
            "unique_count": int(df[col].nunique()),
            "top_value": str(vc.index[0]) if len(vc) > 0 else None,
            "top_percentage": round(vc.iloc[0] / len(df) * 100, 1) if len(vc) > 0 else 0,
            "distribution": [{"value": str(v), "count": int(c), "pct": round(c/len(df)*100, 1)} for v, c in vc.head(5).items()]
        })
    
    return {
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "numeric_columns": len(numeric_cols),
        "categorical_columns": len(categorical_cols),
        "date_range": None,  # TODO: 날짜 컬럼 감지
        "missing_rate": round(df.isna().mean().mean() * 100, 2),
        "duplicate_rows": int(df.duplicated().sum()),
        "memory_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2),
        "numeric_stats": numeric_stats,
        "categorical_stats": categorical_stats
    }


def _run_statistical_analysis(df: pd.DataFrame) -> Dict:
    """고급 통계 분석"""
    results = {"correlations": [], "distributions": [], "outliers": [], "trends": []}
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    # 상관관계 분석
    if len(numeric_cols) >= 2:
        corr_matrix = df[numeric_cols[:15]].corr()
        for i, c1 in enumerate(numeric_cols[:15]):
            for j, c2 in enumerate(numeric_cols[:15]):
                if i < j:
                    val = corr_matrix.loc[c1, c2]
                    if abs(val) > 0.5:
                        relationship = "강한 양의 상관" if val > 0.7 else "양의 상관" if val > 0.5 else "강한 음의 상관" if val < -0.7 else "음의 상관"
                        results['correlations'].append({
                            'var1': c1, 'var2': c2, 
                            'correlation': round(float(val), 3),
                            'relationship': relationship,
                            'interpretation': f"{c1}이(가) 증가하면 {c2}도 {'증가' if val > 0 else '감소'}하는 경향 (r={val:.3f})"
                        })
    
    # 분포 분석
    for col in numeric_cols[:5]:
        data = df[col].dropna()
        if len(data) > 10:
            skew = float(data.skew())
            kurt = float(data.kurtosis())
            dist_type = "정규분포" if abs(skew) < 0.5 and abs(kurt) < 1 else "왼쪽 치우침" if skew < -0.5 else "오른쪽 치우침" if skew > 0.5 else "비정규"
            results['distributions'].append({
                'column': col,
                'distribution_type': dist_type,
                'skewness': round(skew, 3),
                'kurtosis': round(kurt, 3),
                'interpretation': f"{col}은 {dist_type} 형태. {'변환 권장' if abs(skew) > 1 else '분석에 적합'}"
            })
    
    # 이상치 탐지 (IQR 방법)
    for col in numeric_cols[:5]:
        data = df[col].dropna()
        if len(data) > 10:
            Q1, Q3 = data.quantile(0.25), data.quantile(0.75)
            IQR = Q3 - Q1
            outlier_count = int(((data < Q1 - 1.5*IQR) | (data > Q3 + 1.5*IQR)).sum())
            if outlier_count > 0:
                results['outliers'].append({
                    'column': col,
                    'outlier_count': outlier_count,
                    'outlier_percentage': round(outlier_count / len(data) * 100, 2),
                    'lower_bound': round(float(Q1 - 1.5*IQR), 2),
                    'upper_bound': round(float(Q3 + 1.5*IQR), 2),
                    'interpretation': f"{col}에서 {outlier_count}개 이상치 발견 ({outlier_count/len(data)*100:.1f}%)"
                })
    
    return results


def _assess_data_quality(df: pd.DataFrame) -> Dict:
    """데이터 품질 평가"""
    issues = []
    score = 100
    
    # 결측치 평가
    missing_pct = df.isna().mean().mean() * 100
    if missing_pct > 0:
        score -= min(missing_pct * 2, 30)
        severity = "critical" if missing_pct > 20 else "high" if missing_pct > 10 else "medium" if missing_pct > 5 else "low"
        issues.append({
            "type": "missing_data",
            "severity": severity,
            "metric": f"{missing_pct:.1f}%",
            "description": f"전체 데이터의 {missing_pct:.1f}%가 결측치입니다.",
            "affected_columns": [col for col in df.columns if df[col].isna().sum() > 0][:5],
            "recommendation": "결측치 처리 필요 (삭제, 대체, 보간 등)"
        })
    
    # 중복 평가
    dup_pct = df.duplicated().sum() / len(df) * 100
    if dup_pct > 0:
        score -= min(dup_pct * 1.5, 20)
        issues.append({
            "type": "duplicates",
            "severity": "high" if dup_pct > 10 else "medium" if dup_pct > 5 else "low",
            "metric": f"{dup_pct:.1f}%",
            "description": f"{int(df.duplicated().sum())}개의 중복 행 ({dup_pct:.1f}%)",
            "recommendation": "중복 제거 여부 검토"
        })
    
    # 단일값 컬럼
    for col in df.columns:
        if df[col].nunique() == 1:
            score -= 5
            issues.append({
                "type": "constant_column",
                "severity": "low",
                "metric": col,
                "description": f"'{col}' 컬럼은 단일 값만 포함 (분석 의미 없음)",
                "recommendation": "해당 컬럼 제거 고려"
            })
    
    return {
        "quality_score": max(0, round(score)),
        "grade": "A" if score >= 90 else "B" if score >= 80 else "C" if score >= 70 else "D" if score >= 60 else "F",
        "issues": issues,
        "total_issues": len(issues)
    }


def _generate_detailed_insights(df: pd.DataFrame, analysis: Dict) -> List[Dict]:
    """상세 인사이트 생성"""
    insights = []
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    # 상관관계 인사이트 (Scatter Plot Data)
    for corr in analysis.get('correlations', [])[:5]:
        if abs(corr['correlation']) > 0.7:
            # Scatter 데이터 샘플링 (최대 50개)
            try:
                sample_df = df[[corr['var1'], corr['var2']]].dropna().sample(n=min(50, len(df)), random_state=42)
                scatter_data = sample_df.to_dict(orient='records')
            except:
                scatter_data = []

            insights.append({
                "category": "관계 발견",
                "icon": "🔗",
                "title": f"{corr['var1']}와 {corr['var2']}의 강한 상관관계",
                "finding": corr['interpretation'],
                "evidence": f"상관계수 r={corr['correlation']:.3f}",
                "business_implication": f"{corr['var1']}을(를) 조정하면 {corr['var2']}에 영향을 줄 수 있음",
                "priority": "high",
                "confidence": round(abs(corr['correlation']) * 100),
                "visualization": {
                    "type": "scatter",
                    "x": corr['var1'],
                    "y": corr['var2'],
                    "data": scatter_data
                }
            })
    
    # 분포 인사이트 (Histogram Data)
    for dist in analysis.get('distributions', [])[:3]:
        if dist['distribution_type'] != "정규분포":
            # 히스토그램 생성 (15 bins)
            try:
                data = df[dist['column']].dropna()
                counts, bin_edges = np.histogram(data, bins=15)
                hist_data = [{"bin": str(round(bin_edges[i], 1)), "count": int(c)} for i, c in enumerate(counts)]
            except:
                hist_data = []

            insights.append({
                "category": "분포 특성",
                "icon": "📊",
                "title": f"{dist['column']}의 비대칭 분포",
                "finding": dist['interpretation'],
                "evidence": f"왜도={dist['skewness']:.2f}, 첨도={dist['kurtosis']:.2f}",
                "business_implication": "평균보다 중앙값이 더 대표적인 지표일 수 있음",
                "priority": "medium",
                "confidence": 85,
                "visualization": {
                    "type": "bar",
                    "x": "bin",
                    "y": "count",
                    "label": dist['column'],
                    "data": hist_data
                }
            })
    
    # 이상치 인사이트 (Boxplot Summary)
    for outlier in analysis.get('outliers', [])[:3]:
        if outlier['outlier_percentage'] > 1:
            insights.append({
                "category": "이상치 발견",
                "icon": "⚠️",
                "title": f"{outlier['column']}에서 이상치 감지",
                "finding": outlier['interpretation'],
                "evidence": f"정상 범위: {outlier['lower_bound']} ~ {outlier['upper_bound']}",
                "business_implication": "이상치가 특수 케이스인지 데이터 오류인지 확인 필요",
                "priority": "high" if outlier['outlier_percentage'] > 5 else "medium",
                "confidence": 90,
                # 이상치는 분포 차트로도 설명 가능하므로 histogram 재사용
                "visualization": {
                    "type": "bar",
                    "x": "bin",
                    "y": "count",
                    "label": outlier['column'],
                    "data": [] # 데이터가 너무 많아질 수 있으므로 생략하거나 필요시 추가
                }
            })
    
    # 상위 컬럼 인사이트 (Histogram)
    if numeric_cols:
        for col in numeric_cols[:2]:
            data = df[col].dropna()
            if len(data) > 0:
                try:
                    counts, bin_edges = np.histogram(data, bins=15)
                    hist_data = [{"bin": str(round(bin_edges[i], 1)), "count": int(c)} for i, c in enumerate(counts)]
                except:
                    hist_data = []

                insights.append({
                    "category": "핵심 지표",
                    "icon": "📈",
                    "title": f"{col} 분석 결과",
                    "finding": f"평균 {data.mean():,.2f}, 중앙값 {data.median():,.2f}, 표준편차 {data.std():,.2f}",
                    "evidence": f"데이터 범위: {data.min():,.2f} ~ {data.max():,.2f}",
                    "business_implication": f"{'편차가 큼 - 세분화 분석 권장' if data.std() > data.mean() * 0.5 else '안정적인 분포'}",
                    "priority": "medium",
                    "confidence": 95,
                    "visualization": {
                        "type": "bar",
                        "x": "bin",
                        "y": "count",
                        "label": col,
                        "data": hist_data
                    }
                })
    
    return insights


def _generate_actionable_recommendations(df: pd.DataFrame, analysis: Dict) -> List[Dict]:
    """실행 가능한 추천사항"""
    recommendations = []
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    
    # 상관관계 기반 추천
    if analysis.get('correlations'):
        top_corr = analysis['correlations'][0]
        recommendations.append({
            "category": "예측 모델",
            "icon": "🤖",
            "title": f"{top_corr['var2']} 예측 모델 구축",
            "description": f"{top_corr['var1']}을(를) 활용하여 {top_corr['var2']}를 예측할 수 있습니다.",
            "rationale": f"두 변수 간 상관계수 {top_corr['correlation']:.3f}로 예측력 확보 가능",
            "action_items": [
                f"1. {top_corr['var1']} 데이터 수집 강화",
                f"2. 선형 회귀 모델로 {top_corr['var2']} 예측",
                "3. 추가 변수 포함하여 다중 회귀 분석"
            ],
            "expected_impact": "예측 정확도 70% 이상 기대",
            "effort": "중간",
            "priority": "high"
        })
    
    # 세그먼트 분석 추천
    if cat_cols:
        recommendations.append({
            "category": "세그먼트 분석",
            "icon": "🎯",
            "title": f"{cat_cols[0]} 기준 세그먼트 분석",
            "description": f"'{cat_cols[0]}' 컬럼을 기준으로 그룹별 특성을 비교하세요.",
            "rationale": f"'{cat_cols[0]}'는 {df[cat_cols[0]].nunique()}개 그룹으로 분류 가능",
            "action_items": [
                f"1. '{cat_cols[0]}' 세그먼트 탭에서 분석",
                "2. 그룹별 수치 지표 평균 비교",
                "3. 유의한 차이가 있는 그룹 식별"
            ],
            "expected_impact": "그룹별 맞춤 전략 수립",
            "effort": "낮음",
            "priority": "high"
        })
    
    # A/B 테스트 추천
    binary_cols = [c for c in cat_cols if df[c].nunique() == 2]
    if binary_cols and numeric_cols:
        recommendations.append({
            "category": "A/B 테스트",
            "icon": "🧪",
            "title": f"{binary_cols[0]} 기준 A/B 테스트",
            "description": f"'{binary_cols[0]}' 두 그룹 간 지표 차이를 검정하세요.",
            "rationale": f"2개 그룹으로 명확하게 나뉘어 A/B 테스트에 적합",
            "action_items": [
                f"1. A/B 테스트 탭에서 '{binary_cols[0]}' 선택",
                f"2. '{numeric_cols[0]}' 등 수치 지표 비교",
                "3. 통계적 유의성 확인 (p-value < 0.05)"
            ],
            "expected_impact": "의사결정 근거 확보",
            "effort": "낮음",
            "priority": "high"
        })
    
    # 시계열 분석 추천
    date_cols = [c for c in df.columns if 'date' in c.lower() or '날짜' in c or '일자' in c]
    if date_cols and numeric_cols:
        recommendations.append({
            "category": "시계열 분석",
            "icon": "📈",
            "title": "시간에 따른 추세 분석",
            "description": f"'{date_cols[0]}'을(를) 기준으로 시간대별 변화를 분석하세요.",
            "rationale": "시계열 데이터로 추세와 계절성 파악 가능",
            "action_items": [
                f"1. 시계열 탭에서 '{date_cols[0]}' 선택",
                f"2. '{numeric_cols[0]}' 값 컬럼 선택",
                "3. 월별/주별 패턴 및 예측 확인"
            ],
            "expected_impact": "미래 추세 예측",
            "effort": "낮음",
            "priority": "medium"
        })
    
    return recommendations


def _identify_detailed_risks(df: pd.DataFrame, analysis: Dict) -> List[Dict]:
    """상세 리스크 식별"""
    risks = []
    
    missing_pct = df.isna().mean().mean() * 100
    if missing_pct > 10:
        risks.append({
            "type": "data_quality",
            "severity": "high",
            "icon": "🚨",
            "title": "높은 결측률",
            "description": f"전체 데이터의 {missing_pct:.1f}%가 결측치로, 분석 신뢰도가 저하될 수 있습니다.",
            "impact": "분석 결과 왜곡, 모델 성능 저하",
            "mitigation": "결측치 처리 (삭제, 평균/중앙값 대체, 다중대입법)"
        })
    
    if len(df) < 100:
        risks.append({
            "type": "statistical",
            "severity": "medium",
            "icon": "⚠️",
            "title": "작은 표본 크기",
            "description": f"총 {len(df)}건의 데이터로 통계적 유의성 확보가 어려울 수 있습니다.",
            "impact": "검정력 부족, 신뢰구간 확대",
            "mitigation": "추가 데이터 수집 권장 (최소 100~500건)"
        })
    
    if analysis.get('outliers') and sum(o['outlier_count'] for o in analysis['outliers']) > len(df) * 0.1:
        risks.append({
            "type": "outliers",
            "severity": "medium",
            "icon": "📍",
            "title": "다수의 이상치",
            "description": "10% 이상의 데이터가 이상치로 분류됨",
            "impact": "평균/표준편차 왜곡",
            "mitigation": "이상치 원인 파악 후 처리 여부 결정"
        })
    
    return risks


def _identify_opportunities(df: pd.DataFrame, analysis: Dict) -> List[Dict]:
    """기회 요소 식별"""
    opportunities = []
    
    if analysis.get('correlations'):
        strong_corrs = [c for c in analysis['correlations'] if abs(c['correlation']) > 0.7]
        if strong_corrs:
            opportunities.append({
                "type": "prediction",
                "icon": "💡",
                "title": "예측 모델 구축 기회",
                "description": f"{len(strong_corrs)}개의 강한 상관관계 발견 - 머신러닝 모델에 활용 가능",
                "potential_impact": "높은 예측 정확도 달성 가능"
            })
    
    cat_cols = df.select_dtypes(exclude=[np.number]).columns
    for col in cat_cols:
        if 2 <= df[col].nunique() <= 10:
            opportunities.append({
                "type": "segmentation",
                "icon": "🎯",
                "title": f"'{col}' 기반 세분화",
                "description": f"{df[col].nunique()}개 세그먼트로 명확한 그룹 분석 가능",
                "potential_impact": "타겟 그룹별 맞춤 전략"
            })
            break
    
    return opportunities


def _suggest_next_steps(df: pd.DataFrame, analysis: Dict) -> List[Dict]:
    """다음 단계 제안"""
    steps = []
    cat_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    if cat_cols and num_cols:
        binary = [c for c in cat_cols if df[c].nunique() == 2]
        if binary:
            steps.append({
                "step": 1,
                "action": "A/B 테스트 실행",
                "detail": f"'{binary[0]}' 그룹별 '{num_cols[0]}' 비교",
                "icon": "🧪"
            })
    
    steps.append({"step": 2, "action": "세그먼트 분석", "detail": "그룹별 특성 비교", "icon": "🎯"})
    steps.append({"step": 3, "action": "시계열 분석", "detail": "추세 및 예측", "icon": "📈"})
    steps.append({"step": 4, "action": "상관관계 심층 분석", "detail": "인과관계 검증", "icon": "🔗"})
    
    return steps


def _generate_executive_summary(df: pd.DataFrame, analysis: Dict, insights: List[Dict]) -> str:
    """경영진용 요약 리포트"""
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    
    summary_parts = []
    
    # 데이터 규모
    summary_parts.append(f"📊 **데이터 개요**: 총 {len(df):,}건, {len(df.columns)}개 컬럼 (수치형 {len(numeric_cols)}개, 범주형 {len(cat_cols)}개)")
    
    # 품질 현황
    missing_pct = df.isna().mean().mean() * 100
    dup_cnt = df.duplicated().sum()
    quality = "양호" if missing_pct < 5 and dup_cnt < len(df)*0.01 else "개선 필요"
    summary_parts.append(f"✅ **데이터 품질**: {quality} (결측 {missing_pct:.1f}%, 중복 {dup_cnt}건)")
    
    # 핵심 발견
    if analysis.get('correlations'):
        top = analysis['correlations'][0]
        summary_parts.append(f"🔗 **핵심 발견**: {top['var1']}와 {top['var2']} 간 {top['relationship']} (r={top['correlation']:.2f})")
    
    # 주요 인사이트 수
    high_priority = len([i for i in insights if i.get('priority') == 'high'])
    summary_parts.append(f"💡 **인사이트**: 총 {len(insights)}개 발견 (중요 {high_priority}개)")
    
    # 추천 액션
    if cat_cols:
        summary_parts.append(f"🎯 **추천 액션**: '{cat_cols[0]}' 기준 세그먼트 분석으로 그룹별 특성 파악")
    
    return "\n\n".join(summary_parts)
