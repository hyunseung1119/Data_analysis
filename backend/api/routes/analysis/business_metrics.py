"""
Business Metrics Module - 2025 실무 KPI 지표
"""
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np

from . import get_dataframe

router = APIRouter()


class BusinessMetricsRequest(BaseModel):
    """비즈니스 메트릭 요청"""
    file_id: str
    metric_type: str  # ltv, cac, arpu, churn, retention, conversion, mrr, cohort
    revenue_column: Optional[str] = None
    cost_column: Optional[str] = None
    user_column: Optional[str] = None
    date_column: Optional[str] = None
    event_column: Optional[str] = None
    group_column: Optional[str] = None
    period: str = "month"


@router.post("/analysis/business-metrics")
async def calculate_business_metrics(request: BusinessMetricsRequest):
    """2025 실무 비즈니스 KPI 계산"""
    try:
        df = get_dataframe(request.file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    metric_type = request.metric_type.lower()
    
    try:
        if metric_type == "ltv":
            return _calculate_ltv(df, request)
        elif metric_type == "cac":
            return _calculate_cac(df, request)
        elif metric_type == "arpu":
            return _calculate_arpu(df, request)
        elif metric_type == "churn":
            return _calculate_churn(df, request)
        elif metric_type == "retention":
            return _calculate_retention(df, request)
        elif metric_type == "conversion":
            return _calculate_conversion(df, request)
        elif metric_type == "mrr":
            return _calculate_mrr(df, request)
        elif metric_type == "cohort":
            return _calculate_cohort(df, request)
        else:
            raise HTTPException(status_code=400, detail=f"지원하지 않는 메트릭: {metric_type}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def _calculate_ltv(df: pd.DataFrame, req: BusinessMetricsRequest) -> Dict:
    """LTV (고객 생애 가치) 계산"""
    if not req.revenue_column or not req.user_column:
        raise ValueError("LTV 계산에는 revenue_column과 user_column이 필요합니다")
    
    user_revenue = df.groupby(req.user_column)[req.revenue_column].sum()
    avg_revenue = user_revenue.mean()
    total_customers = len(user_revenue)
    
    churn_rate = 0.1
    if req.date_column and req.date_column in df.columns:
        df_sorted = df.sort_values(req.date_column)
        first_period = df_sorted.groupby(req.user_column)[req.date_column].min()
        last_period = df_sorted.groupby(req.user_column)[req.date_column].max()
        active_months = ((pd.to_datetime(last_period) - pd.to_datetime(first_period)).dt.days / 30).mean()
        if active_months > 0:
            churn_rate = 1 / max(active_months, 1)
    
    ltv = avg_revenue / max(churn_rate, 0.01)
    
    return {
        "metric": "LTV",
        "metric_name": "Customer Lifetime Value (고객 생애 가치)",
        "value": round(float(ltv), 2),
        "avg_revenue_per_customer": round(float(avg_revenue), 2),
        "total_customers": int(total_customers),
        "estimated_churn_rate": round(float(churn_rate), 4),
        "interpretation": f"고객 한 명의 예상 생애 가치는 {ltv:,.0f}원입니다.",
        "benchmark": {"좋음": "LTV/CAC > 3", "보통": "LTV/CAC 1-3", "주의": "LTV/CAC < 1"}
    }


def _calculate_cac(df: pd.DataFrame, req: BusinessMetricsRequest) -> Dict:
    """CAC (고객 획득 비용) 계산"""
    if not req.cost_column or not req.user_column:
        raise ValueError("CAC 계산에는 cost_column과 user_column이 필요합니다")
    
    total_cost = df[req.cost_column].sum()
    new_customers = df[req.user_column].nunique()
    cac = total_cost / max(new_customers, 1)
    
    return {
        "metric": "CAC",
        "metric_name": "Customer Acquisition Cost (고객 획득 비용)",
        "value": round(float(cac), 2),
        "total_marketing_cost": round(float(total_cost), 2),
        "new_customers": int(new_customers),
        "interpretation": f"신규 고객 1명을 획득하는 데 평균 {cac:,.0f}원이 소요됩니다.",
        "optimization_tips": ["ROI 높은 채널 집중", "Organic 유입 증가", "바이럴 계수 개선"]
    }


def _calculate_arpu(df: pd.DataFrame, req: BusinessMetricsRequest) -> Dict:
    """ARPU (유저당 평균 수익) 계산"""
    if not req.revenue_column or not req.user_column:
        raise ValueError("ARPU 계산에는 revenue_column과 user_column이 필요합니다")
    
    total_revenue = df[req.revenue_column].sum()
    total_users = df[req.user_column].nunique()
    arpu = total_revenue / max(total_users, 1)
    
    segment_arpu = []
    if req.group_column and req.group_column in df.columns:
        for group in df[req.group_column].unique()[:10]:
            subset = df[df[req.group_column] == group]
            g_revenue = subset[req.revenue_column].sum()
            g_users = subset[req.user_column].nunique()
            segment_arpu.append({
                "segment": str(group),
                "arpu": round(g_revenue / max(g_users, 1), 2),
                "users": int(g_users)
            })
    
    return {
        "metric": "ARPU",
        "metric_name": "Average Revenue Per User (유저당 평균 수익)",
        "value": round(float(arpu), 2),
        "total_revenue": round(float(total_revenue), 2),
        "total_users": int(total_users),
        "segment_arpu": sorted(segment_arpu, key=lambda x: x['arpu'], reverse=True),
        "interpretation": f"유저 1명당 평균 {arpu:,.0f}원의 수익을 창출합니다."
    }


def _calculate_churn(df: pd.DataFrame, req: BusinessMetricsRequest) -> Dict:
    """이탈률 계산"""
    if not req.user_column or not req.date_column:
        raise ValueError("Churn 계산에는 user_column과 date_column이 필요합니다")
    
    df = df.copy()
    df[req.date_column] = pd.to_datetime(df[req.date_column])
    df['period'] = df[req.date_column].dt.to_period('M')
    periods = sorted(df['period'].unique())
    
    churn_data = []
    for i in range(1, len(periods)):
        prev_users = set(df[df['period'] == periods[i-1]][req.user_column])
        curr_users = set(df[df['period'] == periods[i]][req.user_column])
        churned = prev_users - curr_users
        churn_rate = len(churned) / max(len(prev_users), 1)
        churn_data.append({
            "period": str(periods[i]),
            "prev_users": len(prev_users),
            "churned_users": len(churned),
            "churn_rate": round(churn_rate, 4)
        })
    
    avg_churn = np.mean([d['churn_rate'] for d in churn_data]) if churn_data else 0
    
    return {
        "metric": "Churn Rate",
        "metric_name": "이탈률",
        "avg_churn_rate": round(float(avg_churn), 4),
        "avg_churn_pct": f"{avg_churn*100:.1f}%",
        "monthly_churn": churn_data[-6:] if len(churn_data) > 6 else churn_data,
        "interpretation": f"평균 월간 이탈률은 {avg_churn*100:.1f}%입니다.",
        "benchmark": {"SaaS 업계 평균": "3-8%/월", "E-commerce": "5-10%/월", "게임": "10-20%/월"}
    }


def _calculate_retention(df: pd.DataFrame, req: BusinessMetricsRequest) -> Dict:
    """리텐션 계산"""
    if not req.user_column or not req.date_column:
        raise ValueError("Retention 계산에는 user_column과 date_column이 필요합니다")
    
    df = df.copy()
    df[req.date_column] = pd.to_datetime(df[req.date_column])
    
    first_activity = df.groupby(req.user_column)[req.date_column].min().reset_index()
    first_activity.columns = [req.user_column, 'cohort_date']
    
    df = df.merge(first_activity, on=req.user_column)
    df['days_since_first'] = (df[req.date_column] - df['cohort_date']).dt.days
    df['week_number'] = df['days_since_first'] // 7
    
    total_users = df[req.user_column].nunique()
    retention_curve = []
    
    for week in range(min(12, int(df['week_number'].max()) + 1)):
        retained = df[df['week_number'] >= week][req.user_column].nunique()
        retention_rate = retained / max(total_users, 1)
        retention_curve.append({
            "week": int(week),
            "retained_users": int(retained),
            "retention_rate": round(retention_rate, 4)
        })
    
    week_1_retention = retention_curve[1]['retention_rate'] if len(retention_curve) > 1 else 0
    week_4_retention = retention_curve[4]['retention_rate'] if len(retention_curve) > 4 else 0
    
    return {
        "metric": "Retention Rate",
        "metric_name": "유지율",
        "week_1_retention": round(float(week_1_retention), 4),
        "week_4_retention": round(float(week_4_retention), 4),
        "retention_curve": retention_curve,
        "interpretation": f"1주차 리텐션 {week_1_retention*100:.1f}%, 4주차 리텐션 {week_4_retention*100:.1f}%",
        "benchmark": {"우수": "D7 > 20%", "보통": "D7 10-20%", "개선필요": "D7 < 10%"}
    }


def _calculate_conversion(df: pd.DataFrame, req: BusinessMetricsRequest) -> Dict:
    """전환율 계산"""
    if not req.event_column or not req.user_column:
        raise ValueError("Conversion 계산에는 event_column과 user_column이 필요합니다")
    
    events = df[req.event_column].unique()
    total_users = df[req.user_column].nunique()
    
    conversion_funnel = []
    for event in events[:10]:
        event_users = df[df[req.event_column] == event][req.user_column].nunique()
        conversion_funnel.append({
            "event": str(event),
            "users": int(event_users),
            "conversion_rate": round(event_users / max(total_users, 1), 4)
        })
    
    conversion_funnel = sorted(conversion_funnel, key=lambda x: x['users'], reverse=True)
    
    return {
        "metric": "Conversion Rate",
        "metric_name": "전환율",
        "total_users": int(total_users),
        "funnel": conversion_funnel,
        "interpretation": f"총 {total_users}명 중 각 이벤트별 전환율을 분석했습니다."
    }


def _calculate_mrr(df: pd.DataFrame, req: BusinessMetricsRequest) -> Dict:
    """MRR (월간 반복 수익) 계산"""
    if not req.revenue_column or not req.date_column:
        raise ValueError("MRR 계산에는 revenue_column과 date_column이 필요합니다")
    
    df = df.copy()
    df[req.date_column] = pd.to_datetime(df[req.date_column])
    df['month'] = df[req.date_column].dt.to_period('M')
    
    monthly_revenue = df.groupby('month')[req.revenue_column].sum().reset_index()
    monthly_revenue.columns = ['month', 'mrr']
    
    mrr_data = [
        {"month": str(row['month']), "mrr": round(float(row['mrr']), 2)}
        for _, row in monthly_revenue.tail(12).iterrows()
    ]
    
    current_mrr = mrr_data[-1]['mrr'] if mrr_data else 0
    prev_mrr = mrr_data[-2]['mrr'] if len(mrr_data) > 1 else current_mrr
    growth_rate = (current_mrr - prev_mrr) / max(prev_mrr, 1)
    
    return {
        "metric": "MRR",
        "metric_name": "Monthly Recurring Revenue (월간 반복 수익)",
        "current_mrr": round(float(current_mrr), 2),
        "mrr_growth": round(float(growth_rate), 4),
        "mrr_trend": mrr_data,
        "arr": round(float(current_mrr * 12), 2),
        "interpretation": f"현재 MRR {current_mrr:,.0f}원, 전월 대비 {growth_rate*100:+.1f}% 성장"
    }


def _calculate_cohort(df: pd.DataFrame, req: BusinessMetricsRequest) -> Dict:
    """코호트 분석"""
    if not req.user_column or not req.date_column:
        raise ValueError("Cohort 분석에는 user_column과 date_column이 필요합니다")
    
    df = df.copy()
    df[req.date_column] = pd.to_datetime(df[req.date_column])
    
    first_purchase = df.groupby(req.user_column)[req.date_column].min().reset_index()
    first_purchase.columns = [req.user_column, 'cohort_date']
    first_purchase['cohort'] = first_purchase['cohort_date'].dt.to_period('M')
    
    df = df.merge(first_purchase[[req.user_column, 'cohort']], on=req.user_column)
    df['activity_month'] = df[req.date_column].dt.to_period('M')
    df['period_number'] = (df['activity_month'] - df['cohort']).apply(lambda x: x.n if hasattr(x, 'n') else 0)
    
    cohort_data = df.groupby(['cohort', 'period_number'])[req.user_column].nunique().reset_index()
    cohort_sizes = df.groupby('cohort')[req.user_column].nunique()
    
    cohort_table = []
    for cohort in sorted(cohort_data['cohort'].unique())[-6:]:
        cohort_row = {"cohort": str(cohort)}
        for period in range(min(6, int(cohort_data['period_number'].max()) + 1)):
            users = cohort_data[(cohort_data['cohort'] == cohort) & (cohort_data['period_number'] == period)][req.user_column].sum()
            retention = users / max(cohort_sizes.get(cohort, 1), 1)
            cohort_row[f"M{period}"] = round(float(retention), 3)
        cohort_table.append(cohort_row)
    
    return {
        "metric": "Cohort Analysis",
        "metric_name": "코호트 분석",
        "cohort_table": cohort_table,
        "interpretation": "월별 가입 코호트의 시간 경과에 따른 리텐션 추이입니다."
    }
