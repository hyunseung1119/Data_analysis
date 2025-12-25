"""
A/B Testing Module - 고급 A/B 테스트 기능
"""
import math
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import numpy as np
from scipy import stats

from . import get_dataframe

router = APIRouter()


class ABTestRequest(BaseModel):
    """A/B 테스트 요청"""
    file_id: str
    group_column: str
    metric_column: str
    alpha: float = 0.05
    test_type: str = "ttest"  # ttest, welch, mannwhitney
    one_tailed: bool = False
    bootstrap_iterations: int = 0
    group_a_value: Optional[str] = None  # 선택적 그룹 A 값
    group_b_value: Optional[str] = None  # 선택적 그룹 B 값


class ABTestResponse(BaseModel):
    """A/B 테스트 응답"""
    group_a: Dict[str, Any]
    group_b: Dict[str, Any]
    test_type: str
    statistic: float
    p_value: float
    effect_size: float
    confidence_interval: Dict[str, float]
    power: float
    sample_size_recommendation: int
    is_significant: bool
    conclusion: str
    distribution_data: List[Dict[str, Any]]
    bootstrap_results: Optional[Dict[str, Any]] = None


def calculate_power(effect_size: float, n: int, alpha: float = 0.05) -> float:
    """검정력 계산"""
    if effect_size == 0 or n <= 1:
        return 0.0
    try:
        z_alpha = stats.norm.ppf(1 - alpha/2)
        z_power = abs(effect_size) * math.sqrt(n/2) - z_alpha
        return float(stats.norm.cdf(z_power))
    except:
        return 0.5


def sample_size_for_power(effect_size: float, power: float = 0.8, alpha: float = 0.05) -> int:
    """목표 검정력에 필요한 표본 크기"""
    if effect_size == 0:
        return 1000
    try:
        z_alpha = stats.norm.ppf(1 - alpha/2)
        z_power = stats.norm.ppf(power)
        n = 2 * ((z_alpha + z_power) / effect_size) ** 2
        return max(10, int(np.ceil(n)))
    except:
        return 100


def bootstrap_test(group_a, group_b, n_iterations: int = 1000) -> Dict[str, Any]:
    """부트스트랩 가설 검정"""
    observed_diff = group_b.mean() - group_a.mean()
    combined = np.concatenate([group_a.values, group_b.values])
    
    bootstrap_diffs = []
    n_a, n_b = len(group_a), len(group_b)
    
    for _ in range(n_iterations):
        np.random.shuffle(combined)
        boot_a = combined[:n_a]
        boot_b = combined[n_a:n_a+n_b]
        bootstrap_diffs.append(boot_b.mean() - boot_a.mean())
    
    bootstrap_diffs = np.array(bootstrap_diffs)
    p_value = np.mean(np.abs(bootstrap_diffs) >= np.abs(observed_diff))
    
    return {
        "p_value": round(float(p_value), 4),
        "ci_lower": round(float(np.percentile(bootstrap_diffs, 2.5)), 4),
        "ci_upper": round(float(np.percentile(bootstrap_diffs, 97.5)), 4),
        "iterations": n_iterations
    }


@router.post("/analysis/ab-test", response_model=ABTestResponse)
async def run_ab_test(request: ABTestRequest):
    """고급 A/B 테스트"""
    try:
        df = get_dataframe(request.file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    if request.group_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"그룹 컬럼 '{request.group_column}' 없음")
    
    if request.metric_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"지표 컬럼 '{request.metric_column}' 없음")
    
    all_groups = df[request.group_column].unique().tolist()
    
    # 그룹 A/B 값이 지정되었으면 해당 값 사용, 아니면 자동 선택
    if request.group_a_value and request.group_b_value:
        if request.group_a_value not in all_groups:
            raise HTTPException(status_code=400, detail=f"그룹 A 값 '{request.group_a_value}'이 없습니다. 가능한 값: {all_groups}")
        if request.group_b_value not in all_groups:
            raise HTTPException(status_code=400, detail=f"그룹 B 값 '{request.group_b_value}'이 없습니다. 가능한 값: {all_groups}")
        groups = [request.group_a_value, request.group_b_value]
    else:
        # 자동 선택: 상위 2개 그룹
        if len(all_groups) < 2:
            raise HTTPException(status_code=400, detail=f"최소 2개 그룹 필요. 현재: {len(all_groups)}개")
        groups = all_groups[:2]
    
    group_a = df[df[request.group_column] == groups[0]][request.metric_column].dropna()
    group_b = df[df[request.group_column] == groups[1]][request.metric_column].dropna()
    
    if len(group_a) == 0:
        raise HTTPException(status_code=400, detail=f"그룹 A '{groups[0]}'에 유효한 데이터가 없습니다")
    if len(group_b) == 0:
        raise HTTPException(status_code=400, detail=f"그룹 B '{groups[1]}'에 유효한 데이터가 없습니다")
    
    # 테스트 타입에 따른 통계 검정
    if request.test_type == "welch":
        stat, p_value = stats.ttest_ind(group_a, group_b, equal_var=False)
    elif request.test_type == "mannwhitney":
        stat, p_value = stats.mannwhitneyu(group_a, group_b, alternative='two-sided')
    else:
        stat, p_value = stats.ttest_ind(group_a, group_b)
    
    if request.one_tailed:
        p_value = p_value / 2
    
    # Cohen's d
    pooled_std = np.sqrt((group_a.std()**2 + group_b.std()**2) / 2)
    effect_size = float((group_b.mean() - group_a.mean()) / pooled_std) if pooled_std > 0 else 0
    
    # 신뢰구간
    mean_diff = group_b.mean() - group_a.mean()
    se_diff = np.sqrt(group_a.var()/len(group_a) + group_b.var()/len(group_b))
    ci_margin = stats.t.ppf(1 - request.alpha/2, len(group_a) + len(group_b) - 2) * se_diff
    
    confidence_interval = {
        "lower": round(float(mean_diff - ci_margin), 4),
        "upper": round(float(mean_diff + ci_margin), 4),
        "mean_diff": round(float(mean_diff), 4)
    }
    
    n = min(len(group_a), len(group_b))
    power = calculate_power(effect_size, n, request.alpha)
    sample_rec = sample_size_for_power(effect_size, 0.8, request.alpha)
    
    # 분포 데이터
    dist_data = []
    for val in group_a.values[:100]:
        dist_data.append({"group": str(groups[0]), "value": float(val)})
    for val in group_b.values[:100]:
        dist_data.append({"group": str(groups[1]), "value": float(val)})
    
    # 부트스트랩
    bootstrap_results = None
    if request.bootstrap_iterations > 0:
        bootstrap_results = bootstrap_test(group_a, group_b, request.bootstrap_iterations)
    
    is_significant = p_value < request.alpha
    diff_pct = (group_b.mean() - group_a.mean()) / group_a.mean() * 100 if group_a.mean() != 0 else 0
    
    conclusion = f"{'✅ 통계적으로 유의' if is_significant else '⚠️ 유의하지 않음'} (p={p_value:.4f}, α={request.alpha}). "
    conclusion += f"차이: {diff_pct:+.2f}%. 효과크기(Cohen's d): {effect_size:.3f} "
    conclusion += f"({'작음' if abs(effect_size) < 0.2 else '중간' if abs(effect_size) < 0.8 else '큼'}). "
    conclusion += f"검정력: {power:.1%}"
    
    return ABTestResponse(
        group_a={
            "name": str(groups[0]), 
            "mean": round(float(group_a.mean()), 4), 
            "std": round(float(group_a.std()), 4),
            "median": round(float(group_a.median()), 4),
            "n": len(group_a)
        },
        group_b={
            "name": str(groups[1]), 
            "mean": round(float(group_b.mean()), 4), 
            "std": round(float(group_b.std()), 4),
            "median": round(float(group_b.median()), 4),
            "n": len(group_b)
        },
        test_type=request.test_type,
        statistic=round(float(stat), 4),
        p_value=round(float(p_value), 6),
        effect_size=round(effect_size, 4),
        confidence_interval=confidence_interval,
        power=round(power, 4),
        sample_size_recommendation=sample_rec,
        is_significant=is_significant,
        conclusion=conclusion,
        distribution_data=dist_data,
        bootstrap_results=bootstrap_results
    )
