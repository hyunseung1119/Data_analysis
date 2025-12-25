"""
Preprocessing Module - 데이터 전처리 API
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import pandas as pd
import numpy as np
import io
from . import get_dataframe, store_dataframe, generate_file_id

router = APIRouter()


class PreprocessRequest(BaseModel):
    """전처리 요청"""
    file_id: str
    operation: str  # handle_missing, handle_outliers, remove_duplicates, convert_type
    columns: List[str] = []  # 빈 리스트면 전체
    method: str = "drop"  # drop, mean, median, mode, constant, clip, zscore
    constant_value: Optional[float] = None
    threshold: float = 1.5  # IQR multiplier or Z-score threshold


class PreprocessResponse(BaseModel):
    """전처리 응답"""
    success: bool
    new_file_id: str
    operation: str
    changes: Dict[str, Any]
    preview: List[Dict[str, Any]]


# ========== 결측치 처리 ==========
@router.post("/analysis/preprocess/missing", response_model=PreprocessResponse)
async def handle_missing_values(request: PreprocessRequest):
    """결측치 처리"""
    try:
        df = get_dataframe(request.file_id).copy()
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    original_rows = len(df)
    original_missing = int(df.isna().sum().sum())
    
    # 타겟 컬럼 결정
    target_cols = request.columns if request.columns else df.columns.tolist()
    numeric_cols = df[target_cols].select_dtypes(include=[np.number]).columns.tolist()
    
    if request.method == "drop":
        df = df.dropna(subset=target_cols)
    elif request.method == "mean":
        for col in numeric_cols:
            df[col] = df[col].fillna(df[col].mean())
    elif request.method == "median":
        for col in numeric_cols:
            df[col] = df[col].fillna(df[col].median())
    elif request.method == "mode":
        for col in target_cols:
            mode_val = df[col].mode()
            if len(mode_val) > 0:
                df[col] = df[col].fillna(mode_val[0])
    elif request.method == "constant":
        fill_value = request.constant_value if request.constant_value is not None else 0
        for col in target_cols:
            df[col] = df[col].fillna(fill_value)
    
    # 저장
    new_file_id = generate_file_id()
    store_dataframe(new_file_id, df)
    
    return PreprocessResponse(
        success=True,
        new_file_id=new_file_id,
        operation="handle_missing",
        changes={
            "rows_before": original_rows,
            "rows_after": len(df),
            "rows_removed": original_rows - len(df),
            "missing_before": original_missing,
            "missing_after": int(df.isna().sum().sum()),
            "method": request.method,
            "columns_processed": target_cols
        },
        preview=df.head(5).to_dict(orient="records")
    )


# ========== 이상치 처리 ==========
@router.post("/analysis/preprocess/outliers", response_model=PreprocessResponse)
async def handle_outliers(request: PreprocessRequest):
    """이상치 처리"""
    try:
        df = get_dataframe(request.file_id).copy()
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    original_rows = len(df)
    target_cols = request.columns if request.columns else df.select_dtypes(include=[np.number]).columns.tolist()
    outliers_removed = 0
    
    for col in target_cols:
        if col not in df.columns or not pd.api.types.is_numeric_dtype(df[col]):
            continue
        
        data = df[col].dropna()
        if len(data) < 4:
            continue
        
        if request.method in ["drop", "clip", "median_replace"]:
            # IQR 방식
            Q1, Q3 = data.quantile(0.25), data.quantile(0.75)
            IQR = Q3 - Q1
            lower = Q1 - request.threshold * IQR
            upper = Q3 + request.threshold * IQR
            
            outlier_mask = (df[col] < lower) | (df[col] > upper)
            outliers_removed += outlier_mask.sum()
            
            if request.method == "drop":
                df = df[~outlier_mask]
            elif request.method == "clip":
                df[col] = df[col].clip(lower, upper)
            elif request.method == "median_replace":
                df.loc[outlier_mask, col] = data.median()
        
        elif request.method == "zscore":
            # Z-score 방식
            mean, std = data.mean(), data.std()
            if std > 0:
                z_scores = np.abs((df[col] - mean) / std)
                outlier_mask = z_scores > request.threshold
                outliers_removed += outlier_mask.sum()
                df = df[~outlier_mask]
    
    new_file_id = generate_file_id()
    store_dataframe(new_file_id, df)
    
    return PreprocessResponse(
        success=True,
        new_file_id=new_file_id,
        operation="handle_outliers",
        changes={
            "rows_before": original_rows,
            "rows_after": len(df),
            "outliers_affected": int(outliers_removed),
            "method": request.method,
            "threshold": request.threshold,
            "columns_processed": target_cols
        },
        preview=df.head(5).to_dict(orient="records")
    )


# ========== 중복 제거 ==========
@router.post("/analysis/preprocess/duplicates", response_model=PreprocessResponse)
async def remove_duplicates(request: PreprocessRequest):
    """중복 행 제거"""
    try:
        df = get_dataframe(request.file_id).copy()
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    original_rows = len(df)
    subset = request.columns if request.columns else None
    
    duplicates_before = df.duplicated(subset=subset).sum()
    df = df.drop_duplicates(subset=subset, keep='first')
    
    new_file_id = generate_file_id()
    store_dataframe(new_file_id, df)
    
    return PreprocessResponse(
        success=True,
        new_file_id=new_file_id,
        operation="remove_duplicates",
        changes={
            "rows_before": original_rows,
            "rows_after": len(df),
            "duplicates_removed": int(duplicates_before),
            "columns_checked": subset or "all"
        },
        preview=df.head(5).to_dict(orient="records")
    )


# ========== 타입 변환 ==========
@router.post("/analysis/preprocess/convert-type")
async def convert_column_type(request: PreprocessRequest):
    """컬럼 데이터 타입 변환"""
    try:
        df = get_dataframe(request.file_id).copy()
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    if not request.columns:
        raise HTTPException(status_code=400, detail="변환할 컬럼을 지정하세요.")
    
    conversions = []
    for col in request.columns:
        if col not in df.columns:
            continue
        
        old_type = str(df[col].dtype)
        
        try:
            if request.method == "numeric":
                df[col] = pd.to_numeric(df[col], errors='coerce')
            elif request.method == "datetime":
                df[col] = pd.to_datetime(df[col], errors='coerce')
            elif request.method == "string":
                df[col] = df[col].astype(str)
            elif request.method == "category":
                df[col] = df[col].astype('category')
            
            conversions.append({
                "column": col,
                "from": old_type,
                "to": str(df[col].dtype)
            })
        except Exception as e:
            conversions.append({
                "column": col,
                "error": str(e)
            })
    
    new_file_id = generate_file_id()
    store_dataframe(new_file_id, df)
    
    return {
        "success": True,
        "new_file_id": new_file_id,
        "operation": "convert_type",
        "conversions": conversions,
        "preview": df.head(5).to_dict(orient="records")
    }


# ========== EDA 요약 ==========
@router.get("/analysis/eda/{file_id}")
async def get_eda_summary(file_id: str):
    """EDA 요약 정보"""
    try:
        df = get_dataframe(file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    
    # 결측치 요약
    missing_summary = []
    for col in df.columns:
        missing_count = int(df[col].isna().sum())
        if missing_count > 0:
            missing_summary.append({
                "column": col,
                "missing_count": missing_count,
                "missing_pct": round(missing_count / len(df) * 100, 2),
                "dtype": str(df[col].dtype)
            })
    
    # 이상치 요약 (IQR)
    outlier_summary = []
    for col in numeric_cols[:10]:
        data = df[col].dropna()
        if len(data) > 4:
            Q1, Q3 = data.quantile(0.25), data.quantile(0.75)
            IQR = Q3 - Q1
            lower, upper = Q1 - 1.5 * IQR, Q3 + 1.5 * IQR
            outlier_count = int(((data < lower) | (data > upper)).sum())
            if outlier_count > 0:
                outlier_summary.append({
                    "column": col,
                    "outlier_count": outlier_count,
                    "outlier_pct": round(outlier_count / len(data) * 100, 2),
                    "lower_bound": round(float(lower), 2),
                    "upper_bound": round(float(upper), 2)
                })
    
    # 중복 요약
    duplicate_count = int(df.duplicated().sum())
    duplicate_sample = df[df.duplicated(keep=False)].head(5).to_dict(orient="records") if duplicate_count > 0 else []
    
    # 수치형 통계
    numeric_stats = []
    for col in numeric_cols[:10]:
        data = df[col].dropna()
        if len(data) > 0:
            numeric_stats.append({
                "column": col,
                "count": len(data),
                "mean": round(float(data.mean()), 2),
                "std": round(float(data.std()), 2),
                "min": round(float(data.min()), 2),
                "q1": round(float(data.quantile(0.25)), 2),
                "median": round(float(data.median()), 2),
                "q3": round(float(data.quantile(0.75)), 2),
                "max": round(float(data.max()), 2),
                "skewness": round(float(data.skew()), 3)
            })
            
            # 히스토그램 생성 (20 bins)
            try:
                counts, bin_edges = np.histogram(data, bins=20)
                numeric_stats[-1]["histogram"] = [
                    {"bin": i, "start": round(float(bin_edges[i]), 2), "end": round(float(bin_edges[i+1]), 2), "count": int(c)}
                    for i, c in enumerate(counts)
                ]
            except Exception:
                numeric_stats[-1]["histogram"] = []
    
    # 범주형 통계
    categorical_stats = []
    for col in categorical_cols[:5]:
        vc = df[col].value_counts()
        categorical_stats.append({
            "column": col,
            "unique_count": int(df[col].nunique()),
            "top_values": [{"value": str(v), "count": int(c), "pct": round(c/len(df)*100, 1)} for v, c in vc.head(5).items()]
        })
    
    return {
        "file_id": file_id,
        "shape": {"rows": len(df), "columns": len(df.columns)},
        "memory_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2),
        "missing": {
            "total_missing": int(df.isna().sum().sum()),
            "total_pct": round(df.isna().mean().mean() * 100, 2),
            "details": missing_summary
        },
        "duplicates": {
            "count": duplicate_count,
            "pct": round(duplicate_count / len(df) * 100, 2),
            "sample": duplicate_sample
        },
        "outliers": outlier_summary,
        "numeric_summary": numeric_stats,
        "categorical_summary": categorical_stats,
        "column_types": {col: str(df[col].dtype) for col in df.columns}
    }


# ========== CSV 다운로드 ==========
@router.get("/analysis/download/{file_id}")
async def download_csv(file_id: str):
    """CSV 파일 다운로드"""
    try:
        df = get_dataframe(file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    # CSV로 변환
    output = io.StringIO()
    df.to_csv(output, index=False, encoding='utf-8-sig')
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=data_{file_id}.csv"
        }
    )


@router.get("/analysis/download/{file_id}/excel")
async def download_excel(file_id: str):
    """Excel 파일 다운로드"""
    try:
        df = get_dataframe(file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    output = io.BytesIO()
    df.to_excel(output, index=False, engine='openpyxl')
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=data_{file_id}.xlsx"
        }
    )
