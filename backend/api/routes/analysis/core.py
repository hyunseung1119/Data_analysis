"""
Core Analysis - 업로드, 프로파일링, 상관관계
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import pandas as pd
import numpy as np

from . import get_dataframe, store_dataframe, generate_file_id, parse_uploaded_file, list_stored_files

router = APIRouter()


class FileUploadResponse(BaseModel):
    """파일 업로드 응답"""
    file_id: str
    filename: str
    rows: int
    columns: int
    column_names: List[str]
    numeric_columns: List[str]
    categorical_columns: List[str]


class ProfileResponse(BaseModel):
    """프로파일링 응답"""
    file_id: str
    shape: Dict[str, int]
    columns: List[Dict[str, Any]]
    missing_summary: Dict[str, float]
    warnings: List[str]


class CorrelationResponse(BaseModel):
    """상관관계 분석 응답"""
    file_id: str
    matrix: List[Dict[str, Any]]
    strong_correlations: List[Dict[str, Any]]
    insight: str


@router.post("/analysis/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """CSV 파일 업로드"""
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="CSV 또는 Excel 파일만 지원됩니다.")
    
    try:
        content = await file.read()
        df = parse_uploaded_file(content, file.filename)
        file_id = generate_file_id()
        store_dataframe(file_id, df)
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
        
        return FileUploadResponse(
            file_id=file_id,
            filename=file.filename,
            rows=len(df),
            columns=len(df.columns),
            column_names=df.columns.tolist(),
            numeric_columns=numeric_cols,
            categorical_columns=categorical_cols
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"파일 처리 실패: {str(e)}")


@router.get("/analysis/profile/{file_id}", response_model=ProfileResponse)
async def get_profile(file_id: str):
    """데이터 프로파일링"""
    try:
        df = get_dataframe(file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    columns = []
    missing_summary = {}
    warnings = []
    
    for col in df.columns:
        col_info = {
            "name": col,
            "dtype": str(df[col].dtype),
            "missing": int(df[col].isna().sum()),
            "missing_pct": round(df[col].isna().mean() * 100, 2),
            "unique": int(df[col].nunique())
        }
        
        if pd.api.types.is_numeric_dtype(df[col]):
            non_null = df[col].dropna()
            if len(non_null) > 0:
                col_info.update({
                    "mean": round(float(non_null.mean()), 2),
                    "std": round(float(non_null.std()), 2),
                    "min": round(float(non_null.min()), 2),
                    "max": round(float(non_null.max()), 2),
                    "median": round(float(non_null.median()), 2),
                    "q1": round(float(non_null.quantile(0.25)), 2),
                    "q3": round(float(non_null.quantile(0.75)), 2),
                    "skewness": round(float(non_null.skew()), 3),
                    "kurtosis": round(float(non_null.kurtosis()), 3),
                })
        
        columns.append(col_info)
        
        if col_info["missing_pct"] > 0:
            missing_summary[col] = col_info["missing_pct"]
    
    if df.duplicated().sum() > 0:
        warnings.append(f"중복 행 {df.duplicated().sum()}개 발견")
    
    high_missing = [c["name"] for c in columns if c["missing_pct"] > 20]
    if high_missing:
        warnings.append(f"결측치 20% 초과: {', '.join(high_missing)}")
    
    return ProfileResponse(
        file_id=file_id,
        shape={"rows": len(df), "columns": len(df.columns)},
        columns=columns,
        missing_summary=missing_summary,
        warnings=warnings
    )


@router.get("/analysis/correlation/{file_id}", response_model=CorrelationResponse)
async def get_correlation(file_id: str, method: str = "pearson"):
    """상관관계 분석"""
    try:
        df = get_dataframe(file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    if len(numeric_cols) < 2:
        raise HTTPException(status_code=400, detail="상관관계 분석에 최소 2개 수치형 컬럼 필요")
    
    corr_matrix = df[numeric_cols].corr(method=method)
    
    matrix = []
    for col in numeric_cols:
        row = {"id": col}
        for col2 in numeric_cols:
            row[col2] = round(float(corr_matrix.loc[col, col2]), 3)
        matrix.append(row)
    
    strong = []
    for i, col1 in enumerate(numeric_cols):
        for j, col2 in enumerate(numeric_cols):
            if i < j:
                val = corr_matrix.loc[col1, col2]
                if abs(val) > 0.7:
                    strong.append({
                        "pair": [col1, col2],
                        "correlation": round(float(val), 3),
                        "direction": "양의 상관" if val > 0 else "음의 상관"
                    })
    
    insight = ""
    if strong:
        parts = [f"{s['pair'][0]}↔{s['pair'][1]}(r={s['correlation']})" for s in strong[:3]]
        insight = f"강한 상관관계({method}): {', '.join(parts)}"
    else:
        insight = f"강한 상관관계(|r|>0.7, {method})가 없습니다."
    
    return CorrelationResponse(
        file_id=file_id,
        matrix=matrix,
        strong_correlations=strong,
        insight=insight
    )


@router.get("/analysis/files")
async def list_files():
    """업로드된 파일 목록"""
    files = []
    for file_id, df in list_stored_files().items():
        files.append({
            "file_id": file_id,
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": df.columns.tolist()
        })
    return {"files": files}


@router.get("/analysis/column-values/{file_id}/{column}")
async def get_column_values(file_id: str, column: str, max_values: int = 50):
    """컬럼의 고유값 목록 조회 (A/B 테스트 그룹 선택용)"""
    try:
        df = get_dataframe(file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    if column not in df.columns:
        raise HTTPException(status_code=400, detail=f"컬럼 '{column}' 없음")
    
    # 고유값과 각 값의 건수 조회
    value_counts = df[column].value_counts().head(max_values)
    
    values = [
        {
            "value": str(val),
            "count": int(cnt),
            "percentage": round(cnt / len(df) * 100, 1)
        }
        for val, cnt in value_counts.items()
    ]
    
    return {
        "column": column,
        "total_unique": int(df[column].nunique()),
        "values": values,
        "dtype": str(df[column].dtype)
    }

