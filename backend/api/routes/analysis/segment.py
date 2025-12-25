"""
Segment Analysis Module - 세그먼트 분석
"""
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
from scipy import stats

from . import get_dataframe

router = APIRouter()


class SegmentRequest(BaseModel):
    """세그먼트 분석 요청"""
    file_id: str
    segment_column: str
    metric_columns: List[str] = []
    top_n: int = 10


@router.post("/analysis/segment")
async def analyze_segments(request: SegmentRequest):
    """세그먼트별 분석"""
    try:
        df = get_dataframe(request.file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 로드 오류: {str(e)}")
    
    if request.segment_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"세그먼트 컬럼 '{request.segment_column}' 없음")
    
    # 수치형 컬럼 자동 탐지
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    metric_cols = request.metric_columns if request.metric_columns else numeric_cols[:5]
    
    # 세그먼트별 기본 통계
    segments = df[request.segment_column].value_counts().head(request.top_n)
    
    segment_stats = []
    for seg_name, count in segments.items():
        seg_df = df[df[request.segment_column] == seg_name]
        
        stats_dict = {
            "segment": str(seg_name),
            "count": int(count),
            "percentage": round(count / len(df) * 100, 2)
        }
        
        for col in metric_cols:
            if col in seg_df.columns:
                col_data = seg_df[col].dropna()
                if len(col_data) > 0:
                    stats_dict[f"{col}_mean"] = round(float(col_data.mean()), 2)
                    stats_dict[f"{col}_sum"] = round(float(col_data.sum()), 2)
                    stats_dict[f"{col}_median"] = round(float(col_data.median()), 2)
        
        segment_stats.append(stats_dict)
    
    # 세그먼트 간 비교
    comparisons = []
    if len(metric_cols) > 0 and len(segments) >= 2:
        for col in metric_cols[:3]:
            if col not in df.columns:
                continue
            
            # ANOVA 테스트
            groups = [df[df[request.segment_column] == seg][col].dropna().values 
                     for seg in segments.index[:5] if len(df[df[request.segment_column] == seg][col].dropna()) > 0]
            
            if len(groups) >= 2 and all(len(g) > 0 for g in groups):
                try:
                    f_stat, p_value = stats.f_oneway(*groups)
                    # NaN 체크 - float로 변환하여 체크
                    f_stat_f = float(f_stat) if not np.isnan(f_stat) else None
                    p_value_f = float(p_value) if not np.isnan(p_value) else None
                    if f_stat_f is None or p_value_f is None:
                        continue
                    is_significant = bool(p_value_f < 0.05)  # numpy.bool_ -> Python bool
                    comparisons.append({
                        "metric": col,
                        "f_statistic": round(f_stat_f, 4),
                        "p_value": round(p_value_f, 6),
                        "significant": is_significant,
                        "interpretation": f"세그먼트 간 {col} 차이 {'유의' if is_significant else '무의'}"
                    })
                except Exception:
                    pass
    
    # 세그먼트별 분포
    distribution = [
        {"segment": str(seg), "count": int(cnt), "percentage": round(cnt/len(df)*100, 2)}
        for seg, cnt in segments.items()
    ]
    
    # 세그먼트 프로파일링
    profiles = []
    for seg_name in segments.index[:5]:
        seg_df = df[df[request.segment_column] == seg_name]
        
        profile = {"segment": str(seg_name), "traits": []}
        
        for col in metric_cols[:3]:
            if col in seg_df.columns:
                seg_mean = seg_df[col].mean()
                overall_mean = df[col].mean()
                if overall_mean != 0:
                    diff_pct = (seg_mean - overall_mean) / overall_mean * 100
                    if abs(diff_pct) > 10:
                        profile["traits"].append({
                            "metric": col,
                            "segment_avg": round(float(seg_mean), 2),
                            "overall_avg": round(float(overall_mean), 2),
                            "diff_pct": round(float(diff_pct), 1),
                            "description": f"{col} {'높음' if diff_pct > 0 else '낮음'} ({diff_pct:+.1f}%)"
                        })
        
        profiles.append(profile)
    
    # 상위/하위 세그먼트 식별
    rankings = {}
    for col in metric_cols[:3]:
        if col in df.columns:
            seg_means = df.groupby(request.segment_column)[col].mean().sort_values(ascending=False)
            if len(seg_means) >= 2:
                rankings[col] = {
                    "top": str(seg_means.index[0]),
                    "top_value": round(float(seg_means.iloc[0]), 2),
                    "bottom": str(seg_means.index[-1]),
                    "bottom_value": round(float(seg_means.iloc[-1]), 2),
                    "gap": round(float(seg_means.iloc[0] - seg_means.iloc[-1]), 2)
                }
    
    return {
        "segment_column": request.segment_column,
        "total_segments": int(df[request.segment_column].nunique()),
        "analyzed_segments": len(segments),
        "segment_stats": segment_stats,
        "distribution": distribution,
        "comparisons": comparisons,
        "profiles": profiles,
        "rankings": rankings,
        "insights": _generate_segment_insights(segment_stats, comparisons, rankings)
    }


def _generate_segment_insights(stats: List, comparisons: List, rankings: Dict) -> List[str]:
    """세그먼트 인사이트 생성"""
    insights = []
    
    if stats:
        top_seg = max(stats, key=lambda x: x['count'])
        insights.append(f"🏆 최대 세그먼트: '{top_seg['segment']}' ({top_seg['percentage']}% 차지)")
    
    for comp in comparisons:
        if comp['significant']:
            insights.append(f"📊 {comp['metric']}: 세그먼트 간 통계적 유의차 (p={comp['p_value']:.4f})")
    
    for metric, rank in rankings.items():
        insights.append(f"📈 {metric}: '{rank['top']}' 최고 ({rank['top_value']}), '{rank['bottom']}' 최저 ({rank['bottom_value']})")
    
    if not insights:
        insights.append("💡 세그먼트 간 특별한 차이가 발견되지 않았습니다.")
    
    return insights[:5]
