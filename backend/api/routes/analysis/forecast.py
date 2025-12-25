"""
Forecast Module - 예측 분석 API

시계열 예측, What-If 시뮬레이션, 이상 탐지 기능
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
from scipy import stats
from . import get_dataframe

router = APIRouter()


class ForecastRequest(BaseModel):
    file_id: str
    date_column: str
    value_column: str
    periods: int = 30  # 예측 기간 (일)
    frequency: str = "D"  # D=일, W=주, M=월


class WhatIfRequest(BaseModel):
    file_id: str
    column: str
    change_percent: float  # 변화율 (예: 10 = +10%)
    target_column: Optional[str] = None


class AnomalyRequest(BaseModel):
    file_id: str
    columns: Optional[List[str]] = None
    method: str = "iqr"  # iqr, zscore, isolation


@router.post("/analysis/forecast")
async def forecast_timeseries(request: ForecastRequest):
    """시계열 예측 수행"""
    try:
        df = get_dataframe(request.file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")

    if request.date_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"날짜 컬럼 '{request.date_column}'을 찾을 수 없습니다.")
    if request.value_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"값 컬럼 '{request.value_column}'을 찾을 수 없습니다.")

    try:
        # 데이터 준비
        forecast_df = df[[request.date_column, request.value_column]].copy()
        forecast_df.columns = ['ds', 'y']
        forecast_df['ds'] = pd.to_datetime(forecast_df['ds'])
        forecast_df = forecast_df.dropna().sort_values('ds')

        if len(forecast_df) < 10:
            raise HTTPException(status_code=400, detail="예측을 위해 최소 10개 이상의 데이터가 필요합니다.")

        # 간단한 선형 회귀 기반 예측 (Prophet 없이)
        forecast_df['ds_numeric'] = (forecast_df['ds'] - forecast_df['ds'].min()).dt.days
        
        # 선형 회귀
        slope, intercept, r_value, p_value, std_err = stats.linregress(
            forecast_df['ds_numeric'], forecast_df['y']
        )

        # 미래 날짜 생성
        last_date = forecast_df['ds'].max()
        future_dates = pd.date_range(start=last_date + pd.Timedelta(days=1), periods=request.periods, freq=request.frequency)
        future_numeric = [(d - forecast_df['ds'].min()).days for d in future_dates]

        # 예측값 계산
        predictions = [intercept + slope * x for x in future_numeric]
        
        # 신뢰구간 (단순화된 버전)
        residuals = forecast_df['y'] - (intercept + slope * forecast_df['ds_numeric'])
        std_residual = residuals.std()

        # 과거 데이터
        historical = [
            {"date": str(row['ds'].date()), "value": round(float(row['y']), 2), "type": "actual"}
            for _, row in forecast_df.tail(30).iterrows()
        ]

        # 예측 데이터
        forecast_data = [
            {
                "date": str(d.date()),
                "value": round(float(pred), 2),
                "lower": round(float(pred - 1.96 * std_residual), 2),
                "upper": round(float(pred + 1.96 * std_residual), 2),
                "type": "forecast"
            }
            for d, pred in zip(future_dates, predictions)
        ]

        # 트렌드 분석
        trend_direction = "상승" if slope > 0 else "하락" if slope < 0 else "보합"
        trend_strength = abs(r_value)
        trend_label = "강한 " if trend_strength > 0.7 else "약한 " if trend_strength < 0.3 else ""

        # 변화율 계산
        current_value = forecast_df['y'].iloc[-1]
        predicted_end = predictions[-1]
        change_rate = ((predicted_end - current_value) / current_value) * 100

        return {
            "success": True,
            "historical": historical,
            "forecast": forecast_data,
            "statistics": {
                "current_value": round(float(current_value), 2),
                "predicted_value": round(float(predicted_end), 2),
                "change_rate": round(float(change_rate), 2),
                "trend": f"{trend_label}{trend_direction}",
                "confidence": round(float(trend_strength * 100), 1),
                "r_squared": round(float(r_value ** 2), 4),
            },
            "summary": f"{request.periods}일 후 예측: {round(predicted_end, 2)} ({'+' if change_rate > 0 else ''}{round(change_rate, 1)}%)"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"예측 오류: {str(e)}")


@router.post("/analysis/whatif")
async def whatif_simulation(request: WhatIfRequest):
    """What-If 시뮬레이션"""
    try:
        df = get_dataframe(request.file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")

    if request.column not in df.columns:
        raise HTTPException(status_code=400, detail=f"컬럼 '{request.column}'을 찾을 수 없습니다.")

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    if request.column not in numeric_cols:
        raise HTTPException(status_code=400, detail=f"'{request.column}'은 수치형 컬럼이 아닙니다.")

    # 현재 통계
    current_stats = {
        "mean": round(float(df[request.column].mean()), 2),
        "sum": round(float(df[request.column].sum()), 2),
        "std": round(float(df[request.column].std()), 2),
    }

    # 시뮬레이션 적용
    factor = 1 + (request.change_percent / 100)
    simulated_values = df[request.column] * factor

    simulated_stats = {
        "mean": round(float(simulated_values.mean()), 2),
        "sum": round(float(simulated_values.sum()), 2),
        "std": round(float(simulated_values.std()), 2),
    }

    # 상관된 컬럼들의 영향 분석
    correlations = []
    for col in numeric_cols:
        if col != request.column:
            corr = df[request.column].corr(df[col])
            if abs(corr) > 0.3:
                # 상관관계에 비례한 영향 추정
                estimated_impact = request.change_percent * corr
                correlations.append({
                    "column": col,
                    "correlation": round(float(corr), 3),
                    "estimated_impact": round(float(estimated_impact), 2),
                    "direction": "동반 상승" if corr > 0 and request.change_percent > 0 else 
                                "동반 하락" if corr > 0 and request.change_percent < 0 else
                                "역방향 영향"
                })

    return {
        "success": True,
        "scenario": {
            "column": request.column,
            "change_percent": request.change_percent,
        },
        "current": current_stats,
        "simulated": simulated_stats,
        "impact": {
            "mean_change": round(float(simulated_stats["mean"] - current_stats["mean"]), 2),
            "sum_change": round(float(simulated_stats["sum"] - current_stats["sum"]), 2),
        },
        "correlated_effects": correlations,
        "summary": f"'{request.column}'을 {'+' if request.change_percent > 0 else ''}{request.change_percent}% 변경 시, 합계 {'+' if simulated_stats['sum'] > current_stats['sum'] else ''}{round(simulated_stats['sum'] - current_stats['sum'], 2)} 변화 예상"
    }


@router.post("/analysis/anomaly")
async def detect_anomalies(request: AnomalyRequest):
    """이상치 탐지"""
    try:
        df = get_dataframe(request.file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    target_cols = request.columns if request.columns else numeric_cols[:5]

    anomalies = []
    summary = {}

    for col in target_cols:
        if col not in df.columns:
            continue
        
        data = df[col].dropna()
        if len(data) < 10:
            continue

        anomaly_mask = pd.Series([False] * len(data), index=data.index)

        if request.method == "iqr":
            Q1, Q3 = data.quantile(0.25), data.quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            anomaly_mask = (data < lower_bound) | (data > upper_bound)
            method_desc = f"IQR 방법 (범위: {round(float(lower_bound), 2)} ~ {round(float(upper_bound), 2)})"
        elif request.method == "zscore":
            z_scores = np.abs(stats.zscore(data))
            anomaly_mask = z_scores > 3
            method_desc = "Z-Score 방법 (|Z| > 3)"
        else:
            # 기본: IQR
            Q1, Q3 = data.quantile(0.25), data.quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            anomaly_mask = (data < lower_bound) | (data > upper_bound)
            method_desc = "IQR 방법"

        anomaly_count = int(anomaly_mask.sum())
        anomaly_pct = round(anomaly_count / len(data) * 100, 2)

        # 이상치 샘플
        anomaly_values = data[anomaly_mask].head(10).tolist()

        summary[col] = {
            "total_count": len(data),
            "anomaly_count": anomaly_count,
            "anomaly_percentage": anomaly_pct,
            "method": method_desc,
            "sample_anomalies": [round(float(v), 2) for v in anomaly_values],
            "severity": "high" if anomaly_pct > 10 else "medium" if anomaly_pct > 5 else "low"
        }

        if anomaly_count > 0:
            anomalies.append({
                "column": col,
                "count": anomaly_count,
                "percentage": anomaly_pct,
                "severity": summary[col]["severity"]
            })

    # 전체 요약
    total_anomalies = sum(a["count"] for a in anomalies)
    overall_severity = "high" if any(a["severity"] == "high" for a in anomalies) else \
                       "medium" if any(a["severity"] == "medium" for a in anomalies) else "low"

    return {
        "success": True,
        "method": request.method,
        "summary": summary,
        "anomalies": anomalies,
        "total_anomalies": total_anomalies,
        "overall_severity": overall_severity,
        "recommendation": "이상치 검토 및 처리 권장" if total_anomalies > 0 else "이상치가 발견되지 않았습니다."
    }


@router.get("/analysis/forecast/columns/{file_id}")
async def get_forecastable_columns(file_id: str):
    """예측 가능한 컬럼 목록 반환"""
    try:
        df = get_dataframe(file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")

    # 날짜 컬럼 탐지
    date_columns = []
    for col in df.columns:
        try:
            pd.to_datetime(df[col])
            date_columns.append(col)
        except:
            pass

    # 수치형 컬럼
    numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()

    return {
        "date_columns": date_columns,
        "numeric_columns": numeric_columns
    }
