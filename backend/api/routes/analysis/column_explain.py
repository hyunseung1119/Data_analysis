"""
Column Analysis Module - 컬럼 의미 분석 API

AI를 활용하여 각 컬럼의 의미와 데이터 특성을 분석합니다.
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
import json
from . import get_dataframe
from services.llm_service import get_llm_service

router = APIRouter()


class ColumnAnalysisRequest(BaseModel):
    file_id: str
    columns: Optional[List[str]] = None  # None이면 전체 컬럼


class ColumnInfo(BaseModel):
    column: str
    dtype: str
    sample_values: List[Any]
    unique_count: int
    null_count: int
    ai_description: str
    feature_type: str  # numeric, categorical, datetime, text, id
    business_meaning: str
    analysis_tips: List[str]


@router.post("/analysis/column-explain")
async def explain_columns(request: ColumnAnalysisRequest):
    """컬럼 의미 AI 분석"""
    try:
        df = get_dataframe(request.file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")

    # 분석할 컬럼 선택
    target_columns = request.columns if request.columns else list(df.columns)[:20]  # 최대 20개

    # 컬럼 정보 수집
    column_info = []
    for col in target_columns:
        if col not in df.columns:
            continue
        
        series = df[col]
        info = {
            "column": col,
            "dtype": str(series.dtype),
            "sample_values": series.dropna().head(5).tolist(),
            "unique_count": int(series.nunique()),
            "null_count": int(series.isnull().sum()),
            "null_pct": round(series.isnull().sum() / len(df) * 100, 2),
        }
        
        # 기본 통계
        if series.dtype in ['int64', 'float64']:
            info["min"] = float(series.min()) if not pd.isna(series.min()) else None
            info["max"] = float(series.max()) if not pd.isna(series.max()) else None
            info["mean"] = round(float(series.mean()), 2) if not pd.isna(series.mean()) else None
        
        column_info.append(info)

    # AI 분석 요청
    llm = get_llm_service()
    
    system_prompt = """
You are a data analyst expert. Analyze each column and explain what it represents.
For each column, provide:
1. ai_description: What this column likely represents (in Korean, 1-2 sentences)
2. feature_type: One of [numeric, categorical, datetime, text, id, binary, ordinal]
3. business_meaning: Business context or usage (in Korean, 1 sentence)
4. analysis_tips: 2-3 analysis suggestions for this column (in Korean)

Return JSON array format:
[{
    "column": "column_name",
    "ai_description": "...",
    "feature_type": "...",
    "business_meaning": "...",
    "analysis_tips": ["...", "..."]
}, ...]
"""

    user_prompt = f"""
분석할 컬럼 정보:
{json.dumps(column_info, ensure_ascii=False, default=str)[:4000]}

위 컬럼들의 의미와 분석 방법을 분석해주세요.
"""

    try:
        response = await llm.chat(system_prompt, user_prompt)
        
        # JSON 파싱
        cleaned = response.replace("```json", "").replace("```", "").strip()
        ai_results = json.loads(cleaned)
        
        # 결과 병합
        result_map = {r["column"]: r for r in ai_results}
        
        final_results = []
        for info in column_info:
            col = info["column"]
            ai_info = result_map.get(col, {})
            
            final_results.append({
                **info,
                "ai_description": ai_info.get("ai_description", "분석 중..."),
                "feature_type": ai_info.get("feature_type", "unknown"),
                "business_meaning": ai_info.get("business_meaning", ""),
                "analysis_tips": ai_info.get("analysis_tips", [])
            })
        
        return {
            "success": True,
            "total_columns": len(df.columns),
            "analyzed_columns": len(final_results),
            "columns": final_results
        }
        
    except json.JSONDecodeError:
        # JSON 파싱 실패 시 기본 분석 반환
        return {
            "success": True,
            "total_columns": len(df.columns),
            "analyzed_columns": len(column_info),
            "columns": [
                {
                    **info,
                    "ai_description": _infer_column_meaning(info),
                    "feature_type": _infer_feature_type(info),
                    "business_meaning": "",
                    "analysis_tips": []
                }
                for info in column_info
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 분석 오류: {str(e)}")


def _infer_feature_type(info: Dict) -> str:
    """규칙 기반 피처 타입 추론"""
    dtype = info["dtype"]
    col = info["column"].lower()
    unique = info["unique_count"]
    
    if "date" in col or "time" in col:
        return "datetime"
    if "id" in col or col.endswith("_id"):
        return "id"
    if dtype in ["int64", "float64"]:
        if unique <= 10:
            return "ordinal"
        return "numeric"
    if dtype == "object":
        if unique <= 20:
            return "categorical"
        return "text"
    if dtype == "bool":
        return "binary"
    return "unknown"


def _infer_column_meaning(info: Dict) -> str:
    """규칙 기반 컬럼 의미 추론"""
    col = info["column"].lower()
    dtype = info["dtype"]
    
    # 일반적인 컬럼명 패턴
    patterns = {
        "id": "고유 식별자",
        "name": "이름 정보",
        "date": "날짜 정보",
        "time": "시간 정보",
        "price": "가격 정보",
        "amount": "금액 정보",
        "count": "개수/횟수",
        "age": "나이 정보",
        "year": "연도 정보",
        "month": "월 정보",
        "category": "카테고리 분류",
        "type": "유형 분류",
        "status": "상태 정보",
        "score": "점수/평점",
        "rating": "평점 정보",
        "email": "이메일 주소",
        "phone": "전화번호",
        "address": "주소 정보",
    }
    
    for pattern, meaning in patterns.items():
        if pattern in col:
            return meaning
    
    if dtype in ["int64", "float64"]:
        return "수치형 데이터"
    return "분류/텍스트 데이터"
