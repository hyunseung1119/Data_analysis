"""
AI Preprocessing Module - LLM 기반 데이터 진단 및 전처리 제안
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

class AIDiagnosisRequest(BaseModel):
    file_id: str

class DiagnosisIssue(BaseModel):
    type: str  # standardization, semantic_outlier, pii, missing_context, other
    column: str
    description: str
    suggestion: str
    severity: str  # high, medium, low

class AIDiagnosisResponse(BaseModel):
    file_id: str
    issues: List[DiagnosisIssue]
    total_issues: int

@router.post("/analysis/ai-preprocess/diagnose", response_model=AIDiagnosisResponse)
async def diagnose_data_with_ai(request: AIDiagnosisRequest):
    """
    LLM을 사용하여 데이터의 품질 문제(의미적 불일치, 이상치, PII 등)를 진단합니다.
    """
    try:
        df = get_dataframe(request.file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")

    # 1. 데이터 요약 생성
    summary = {
        "columns": list(df.columns),
        "dtypes": {col: str(df[col].dtype) for col in df.columns},
        "shape": df.shape,
        "sample": df.head(5).to_dict(orient="records"),
        "null_counts": df.isnull().sum().to_dict(),
        "unique_counts": {col: int(df[col].nunique()) for col in df.columns},
    }
    
    # 텍스트 컬럼의 고유값 샘플 (수치형 제외)
    object_cols = df.select_dtypes(include=['object', 'string']).columns
    summary["value_samples"] = {}
    for col in object_cols:
        if df[col].nunique() < 50:
            summary["value_samples"][col] = df[col].unique().tolist()
        else:
            summary["value_samples"][col] = df[col].unique()[:10].tolist()

    # 2. LLM 프롬프트 구성
    system_prompt = """
    You are a Data Quality Expert AI. Your goal is to diagnose data quality issues based on the provided dataset summary.
    Focus on 'semantic' issues that valid code might miss, such as:
    1. Standardization: Same meaning but different text (e.g., 'USA', 'U.S.A', 'United States').
    2. Semantic Outliers: Values that make no sense in context (e.g., 'Age': 200, 'Salary': -100).
    3. PII (Personally Identifiable Information): Columns containing names, phones, emails needing masking.
    4. Ambiguous Columns: Column names that are unclear (e.g., 'col1', 'temp').
    
    Output must be a strictly valid JSON object with a key 'issues' containing a list of issues.
    Each issue object must have:
    - "type": One of ["standardization", "semantic_outlier", "pii", "ambiguous_col", "other"]
    - "column": The column name
    - "description": Brief explanation of the problem (MUST be in Korean)
    - "suggestion": Actionable recommendation (MUST be in Korean)
    - "severity": "high", "medium", or "low"
    
    If no significant issues are found, return empty list in 'issues'.
    Response must be ONLY JSON. No markdown fencing.
    """
    
    user_message = f"""
    Analyze this dataset summary and find data quality issues:
    {json.dumps(summary, default=str, ensure_ascii=False)[:3000]}  # Limit token usage
    """

    # 3. LLM 호출
    llm = get_llm_service()
    try:
        response_text = await llm.chat(system_prompt, user_message)
        
        # JSON 파싱 (마크다운 제거)
        cleaned_text = response_text.replace("```json", "").replace("```", "").strip()
        result = json.loads(cleaned_text)
        
        issues = result.get("issues", [])
        
        return AIDiagnosisResponse(
            file_id=request.file_id,
            issues=issues,
            total_issues=len(issues)
        )
        
    except Exception as e:
        print(f"AI Diagnosis Error: {e}")
        # 실패 시 빈 결과 반환보다는 에러를 알리는 이슈 하나 추가
        return AIDiagnosisResponse(
            file_id=request.file_id,
            issues=[{
                "type": "error",
                "column": "system",
                "description": f"AI 분석 중 오류 발생: {str(e)}",
                "suggestion": "잠시 후 다시 시도해주세요.",
                "severity": "low"
            }],
            total_issues=1
        )
