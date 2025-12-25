"""
Analysis Routes - 공통 모듈
"""
import io
import uuid
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

# 임시 저장소 (프로덕션에서는 DB 사용)
_uploaded_files: Dict[str, pd.DataFrame] = {}


def get_dataframe(file_id: str) -> pd.DataFrame:
    """파일 ID로 DataFrame 조회"""
    if file_id not in _uploaded_files:
        raise KeyError(f"파일을 찾을 수 없습니다: {file_id}")
    return _uploaded_files[file_id]


def store_dataframe(file_id: str, df: pd.DataFrame):
    """DataFrame 저장"""
    _uploaded_files[file_id] = df


def list_stored_files() -> Dict[str, pd.DataFrame]:
    """저장된 모든 파일 조회"""
    return _uploaded_files


def generate_file_id() -> str:
    """새 파일 ID 생성"""
    return str(uuid.uuid4())[:8]


def parse_uploaded_file(content: bytes, filename: str) -> pd.DataFrame:
    """업로드된 파일을 DataFrame으로 변환"""
    if filename.endswith('.csv'):
        return pd.read_csv(io.BytesIO(content))
    else:
        return pd.read_excel(io.BytesIO(content))
