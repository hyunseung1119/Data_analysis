"""
AI Code Generator - Pandas 코드 자동 생성 API

사용자의 자연어 지시를 받아 데이터 전처리 Pandas 코드를 자동으로 생성합니다.
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from . import get_dataframe
from services.llm_service import get_llm_service

router = APIRouter()

class CodeGenerationRequest(BaseModel):
    file_id: str
    instruction: str  # 예: "결측치를 평균으로 채워줘" or "age 컬럼을 문자열로 바꿔줘"
    context: Optional[str] = None  # 추가 컨텍스트

class CodeGenerationResponse(BaseModel):
    success: bool
    code: str
    explanation: str
    warnings: list[str] = []

@router.post("/analysis/ai-preprocess/generate-code", response_model=CodeGenerationResponse)
async def generate_preprocessing_code(request: CodeGenerationRequest):
    """
    사용자 지시를 바탕으로 Pandas 전처리 코드를 자동 생성합니다.
    """
    try:
        df = get_dataframe(request.file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")

    # 데이터프레임 정보 수집
    df_info = {
        "columns": list(df.columns),
        "dtypes": {col: str(df[col].dtype) for col in df.columns},
        "shape": df.shape,
        "sample": df.head(3).to_dict(orient="records"),
        "null_counts": df.isnull().sum().to_dict(),
    }

    # LLM 프롬프트 구성
    system_prompt = """
You are a Python data scientist assistant. Generate clean, production-ready Pandas code based on the user's instruction.

Rules:
1. Use 'df' as the DataFrame variable name (it's already loaded).
2. Write clean, well-commented Python/Pandas code.
3. Handle edge cases (e.g., check if column exists).
4. Do NOT include `import` statements or file loading code.
5. Explain what the code does in Korean.
6. If the instruction is unsafe or unclear, provide warnings.

Output format (JSON):
{
    "code": "# Your pandas code here\ndf['col'] = ...",
    "explanation": "한국어로 코드 설명",
    "warnings": ["경고 메시지 (있다면)"]
}
"""

    user_message = f"""
데이터프레임 정보:
{json.dumps(df_info, ensure_ascii=False, default=str)[:2000]}

사용자 지시:
{request.instruction}

{('추가 컨텍스트: ' + request.context) if request.context else ''}

위 데이터에 적용할 Pandas 코드를 생성해주세요.
"""

    llm = get_llm_service()
    try:
        response_text = await llm.chat(system_prompt, user_message)
        
        # JSON 파싱
        cleaned_text = response_text.replace("```json", "").replace("```", "").strip()
        result = json.loads(cleaned_text)
        
        return CodeGenerationResponse(
            success=True,
            code=result.get("code", "# 코드 생성 실패"),
            explanation=result.get("explanation", "설명 없음"),
            warnings=result.get("warnings", [])
        )
        
    except json.JSONDecodeError:
        # JSON 파싱 실패 시 원본 텍스트를 코드로 반환
        return CodeGenerationResponse(
            success=True,
            code=response_text,
            explanation="AI가 생성한 코드입니다. 형식 파싱에 실패하여 원본을 반환합니다.",
            warnings=["JSON 형식 파싱 실패 - 코드만 반환됨"]
        )
    except Exception as e:
        return CodeGenerationResponse(
            success=False,
            code="",
            explanation=f"코드 생성 중 오류 발생: {str(e)}",
            warnings=[str(e)]
        )


@router.post("/analysis/ai-preprocess/execute-code")
async def execute_preprocessing_code(request: CodeGenerationRequest):
    """
    생성된 코드를 실제로 실행합니다. (옵션)
    주의: 보안상 위험할 수 있으므로 신중하게 사용
    """
    try:
        df = get_dataframe(request.file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    # 먼저 코드 생성
    gen_response = await generate_preprocessing_code(request)
    
    if not gen_response.success:
        return {"success": False, "error": gen_response.explanation}
    
    code = gen_response.code
    
    # 위험한 명령어 필터링
    dangerous_keywords = ['os.', 'subprocess', 'exec(', 'eval(', '__', 'open(', 'import ']
    for keyword in dangerous_keywords:
        if keyword in code:
            return {
                "success": False, 
                "error": f"보안 위험: '{keyword}' 사용 불가",
                "code": code
            }
    
    # 코드 실행
    try:
        local_vars = {"df": df.copy()}
        exec(code, {"__builtins__": {}}, local_vars)
        
        new_df = local_vars.get("df", df)
        
        # 결과 저장
        from . import store_dataframe
        import uuid
        new_file_id = str(uuid.uuid4())[:8]
        store_dataframe(new_file_id, new_df)
        
        return {
            "success": True,
            "new_file_id": new_file_id,
            "code": code,
            "explanation": gen_response.explanation,
            "changes": {
                "rows_before": len(df),
                "rows_after": len(new_df),
                "columns_before": len(df.columns),
                "columns_after": len(new_df.columns)
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"코드 실행 오류: {str(e)}",
            "code": code
        }
