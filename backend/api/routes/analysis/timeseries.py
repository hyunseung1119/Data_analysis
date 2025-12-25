"""
Time Series Analysis Module - 시계열 분석
"""
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
from scipy import stats

from . import get_dataframe

router = APIRouter()


class TimeSeriesRequest(BaseModel):
    """시계열 분석 요청"""
    file_id: str
    date_column: str
    value_column: str
    period: str = "D"  # D=일, W=주, M=월, Q=분기
    forecast_periods: int = 7


@router.post("/analysis/timeseries")
async def analyze_timeseries(request: TimeSeriesRequest):
    """시계열 분석 및 트렌드 예측"""
    try:
        df = get_dataframe(request.file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    if request.date_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"날짜 컬럼 '{request.date_column}' 없음")
    if request.value_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"값 컬럼 '{request.value_column}' 없음")
    
    df = df.copy()
    original_col = df[request.date_column].copy()
    
    # 자동 날짜 형변환 (다양한 형식 지원)
    try:
        # 1. 먼저 infer_datetime_format으로 시도
        df[request.date_column] = pd.to_datetime(original_col, infer_datetime_format=True, errors='coerce')
        
        # 2. 변환 실패 시 dateutil로 재시도 (행별 파싱)
        valid_count = df[request.date_column].notna().sum()
        if valid_count < len(df) * 0.5:
            from dateutil import parser as date_parser
            
            def safe_parse(val):
                try:
                    if pd.isna(val) or val == '':
                        return pd.NaT
                    return date_parser.parse(str(val), fuzzy=True)
                except:
                    return pd.NaT
            
            df[request.date_column] = original_col.apply(safe_parse)
        
        # 3. 유효한 날짜 확인
        valid_dates = df[request.date_column].notna().sum()
        if valid_dates < 10:
            # 샘플 값 표시
            sample = original_col.dropna().head(3).tolist()
            raise HTTPException(status_code=400, detail=f"날짜 형식을 인식할 수 없습니다. 샘플값: {sample}")
        
        # 4. NaT 제거
        df = df.dropna(subset=[request.date_column])
        
        # 5. datetime으로 확실히 변환
        if not pd.api.types.is_datetime64_any_dtype(df[request.date_column]):
            df[request.date_column] = pd.to_datetime(df[request.date_column])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"날짜 변환 실패: {str(e)}")
    
    df = df.sort_values(request.date_column)
    
    # 기간별 집계
    try:
        df['period'] = df[request.date_column].dt.to_period(request.period)
    except Exception as e:
        # 타입 확인 정보 추가
        dtype = str(df[request.date_column].dtype)
        raise HTTPException(status_code=400, detail=f"기간 집계 실패 (타입: {dtype}): {str(e)}")
        
    agg = df.groupby('period')[request.value_column].agg(['sum', 'mean', 'count']).reset_index()
    agg['period_str'] = agg['period'].astype(str)
    
    # 시계열 데이터
    time_series = [
        {"period": row['period_str'], "sum": round(float(row['sum']), 2), "mean": round(float(row['mean']), 2), "count": int(row['count'])}
        for _, row in agg.iterrows()
    ]
    
    # 트렌드 분석
    if len(agg) >= 3:
        x = np.arange(len(agg))
        y = agg['sum'].values
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
        
        trend_direction = "상승" if slope > 0 else "하락"
        trend_strength = abs(r_value)
        
        # 간단한 선형 예측
        forecast = []
        for i in range(1, request.forecast_periods + 1):
            pred_x = len(agg) + i - 1
            pred_y = slope * pred_x + intercept
            forecast.append({"period": f"예측{i}", "value": round(float(max(0, pred_y)), 2)})
    else:
        trend_direction = "데이터 부족"
        trend_strength = 0
        slope = 0
        forecast = []
    
    # 이동평균 계산
    if len(agg) >= 3:
        agg['ma3'] = agg['sum'].rolling(window=3, min_periods=1).mean()
        agg['ma7'] = agg['sum'].rolling(window=min(7, len(agg)), min_periods=1).mean()
        moving_averages = [
            {"period": row['period_str'], "ma3": round(float(row['ma3']), 2), "ma7": round(float(row['ma7']), 2)}
            for _, row in agg.iterrows()
        ]
    else:
        moving_averages = []
    
    # 계절성 분석 (월별 패턴)
    seasonality = []
    if request.period in ['D', 'W'] and len(df) > 30:
        df['month'] = df[request.date_column].dt.month
        monthly = df.groupby('month')[request.value_column].mean()
        seasonality = [{"month": int(m), "avg": round(float(v), 2)} for m, v in monthly.items()]
    
    # 변동성 분석
    values = agg['sum'].values
    volatility = float(np.std(values) / np.mean(values)) if np.mean(values) != 0 else 0
    
    # 변화율 계산
    growth_rates = []
    for i in range(1, min(6, len(agg))):
        prev = agg['sum'].iloc[-(i+1)]
        curr = agg['sum'].iloc[-i]
        rate = (curr - prev) / prev * 100 if prev != 0 else 0
        growth_rates.append({"from": agg['period_str'].iloc[-(i+1)], "to": agg['period_str'].iloc[-i], "rate": round(float(rate), 2)})
    
    return {
        "time_series": time_series[-50:],  # 최근 50개
        "trend": {
            "direction": trend_direction,
            "slope": round(float(slope), 4),
            "strength": round(float(trend_strength), 3),
            "interpretation": f"{trend_direction} 추세 (기울기: {slope:.2f}, R²: {trend_strength:.2%})"
        },
        "forecast": forecast,
        "moving_averages": moving_averages[-50:],
        "seasonality": seasonality,
        "volatility": {
            "cv": round(volatility, 4),
            "interpretation": "높음" if volatility > 0.5 else "보통" if volatility > 0.2 else "안정"
        },
        "growth_rates": growth_rates,
        "summary": {
            "total_periods": len(agg),
            "total_sum": round(float(agg['sum'].sum()), 2),
            "avg_per_period": round(float(agg['sum'].mean()), 2),
            "max_period": agg.loc[agg['sum'].idxmax(), 'period_str'],
            "max_value": round(float(agg['sum'].max()), 2),
            "min_period": agg.loc[agg['sum'].idxmin(), 'period_str'],
            "min_value": round(float(agg['sum'].min()), 2)
        }
    }
