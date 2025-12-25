"""
Charts Module - 시각화용 차트 데이터 생성
"""
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
from scipy import stats
from . import get_dataframe

router = APIRouter()

class ChartDataRequest(BaseModel):
    file_id: str
    chart_type: str
    x_column: Optional[str] = None
    y_column: Optional[str] = None
    group_by: Optional[str] = None
    bins: int = 20

@router.post("/analysis/chart-data")
async def get_chart_data(request: ChartDataRequest):
    try:
        df = get_dataframe(request.file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    if request.chart_type == "histogram":
        if not request.x_column:
            raise HTTPException(status_code=400, detail="x_column 필요")
        if request.x_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"컬럼 '{request.x_column}' 없음")
        
        # 수치형 확인
        if not pd.api.types.is_numeric_dtype(df[request.x_column]):
            raise HTTPException(status_code=400, detail=f"'{request.x_column}'은 수치형 컬럼이 아닙니다. 히스토그램에는 수치형 컬럼을 선택하세요.")
        
        data = df[request.x_column].dropna()
        
        # 데이터 유효성 검사
        if len(data) == 0:
            raise HTTPException(status_code=400, detail="유효한 데이터가 없습니다.")
        
        # 무한값 제거
        data = data[np.isfinite(data)]
        if len(data) == 0:
            raise HTTPException(status_code=400, detail="유효한 숫자 데이터가 없습니다 (무한값만 존재).")
        
        hist, edges = np.histogram(data, bins=min(request.bins, len(data.unique())))
        return {
            "chart_type": "histogram", "column": request.x_column,
            "data": [{"bin": f"{edges[i]:.2f}", "count": int(hist[i])} for i in range(len(hist))],
            "stats": {"mean": round(float(data.mean()), 2), "std": round(float(data.std()), 2), "min": round(float(data.min()), 2), "max": round(float(data.max()), 2)}
        }
    elif request.chart_type == "scatter":
        if not request.x_column or not request.y_column:
            raise HTTPException(status_code=400, detail="x_column과 y_column 필요")
        sample = df[[request.x_column, request.y_column]].dropna()
        if len(sample) > 500: sample = sample.sample(500)
        corr = df[[request.x_column, request.y_column]].corr().iloc[0, 1]
        return {"chart_type": "scatter", "data": [{"x": float(r[request.x_column]), "y": float(r[request.y_column])} for _, r in sample.iterrows()], "correlation": round(float(corr), 3)}
    elif request.chart_type == "bar":
        if not request.x_column:
            raise HTTPException(status_code=400, detail="x_column 필요")
        if request.y_column:
            agg = df.groupby(request.x_column)[request.y_column].mean().head(20)
            return {"chart_type": "bar", "data": [{"category": str(k), "value": round(float(v), 2)} for k, v in agg.items()]}
        else:
            counts = df[request.x_column].value_counts().head(20)
            return {"chart_type": "bar", "data": [{"category": str(k), "value": int(v)} for k, v in counts.items()]}
    elif request.chart_type == "line":
        if not request.x_column or not request.y_column:
            raise HTTPException(status_code=400, detail="x_column과 y_column 필요")
        sorted_df = df[[request.x_column, request.y_column]].dropna().sort_values(request.x_column)
        if len(sorted_df) > 200: sorted_df = sorted_df.iloc[::len(sorted_df)//200]
        return {"chart_type": "line", "data": [{"x": str(r[request.x_column]), "y": float(r[request.y_column])} for _, r in sorted_df.iterrows()]}
    elif request.chart_type == "boxplot":
        if not request.y_column:
            raise HTTPException(status_code=400, detail="y_column 필요")
        data = df[request.y_column].dropna()
        return {"chart_type": "boxplot", "data": [{"group": request.y_column, "min": float(data.min()), "q1": float(data.quantile(0.25)), "median": float(data.median()), "q3": float(data.quantile(0.75)), "max": float(data.max())}]}
    raise HTTPException(status_code=400, detail=f"지원하지 않는 차트: {request.chart_type}")

@router.get("/analysis/describe/{file_id}/{column}")
async def describe_column(file_id: str, column: str):
    try:
        df = get_dataframe(file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    if column not in df.columns:
        raise HTTPException(status_code=400, detail=f"컬럼 '{column}' 없음")
    col = df[column].dropna()
    if pd.api.types.is_numeric_dtype(col):
        return {"column": column, "type": "numeric", "count": len(col), "mean": round(float(col.mean()), 4), "std": round(float(col.std()), 4), "min": round(float(col.min()), 4), "max": round(float(col.max()), 4), "median": round(float(col.median()), 4)}
    else:
        vc = col.value_counts()
        return {"column": column, "type": "categorical", "count": len(col), "unique": int(col.nunique()), "top_values": [{"value": str(v), "count": int(c)} for v, c in vc.head(10).items()]}
