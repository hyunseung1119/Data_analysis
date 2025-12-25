"""
LLM Service - OpenAI API 래퍼

LLM 호출을 캡슐화하여 의존성 주입 가능하게 함.
"""
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from functools import lru_cache
from dotenv import load_dotenv

# Load .env file from backend directory
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage


class LLMService:
    """
    LLM 서비스 클래스
    
    LangChain ChatOpenAI를 래핑하여 통일된 인터페이스 제공
    """
    
    def __init__(
        self, 
        model: str = "gpt-4.1-mini",
        temperature: float = 0.3,
        max_tokens: int = 4000,
        api_key: Optional[str] = None
    ):
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        
        self._llm = ChatOpenAI(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=api_key or os.getenv("OPENAI_API_KEY"),
        )
    
    async def invoke(
        self, 
        messages: List[Dict[str, str]],
        **kwargs
    ) -> str:
        """
        LLM 호출
        
        Args:
            messages: [{"role": "system"|"user"|"assistant", "content": "..."}]
            
        Returns:
            응답 문자열
        """
        langchain_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if role == "system":
                langchain_messages.append(SystemMessage(content=content))
            elif role == "assistant":
                langchain_messages.append(AIMessage(content=content))
            else:
                langchain_messages.append(HumanMessage(content=content))
        
        response = await self._llm.ainvoke(langchain_messages)
        return response.content
    
    def invoke_sync(
        self, 
        messages: List[Dict[str, str]],
        **kwargs
    ) -> str:
        """동기 호출"""
        langchain_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if role == "system":
                langchain_messages.append(SystemMessage(content=content))
            elif role == "assistant":
                langchain_messages.append(AIMessage(content=content))
            else:
                langchain_messages.append(HumanMessage(content=content))
        
        response = self._llm.invoke(langchain_messages)
        return response.content
    
    async def chat(
        self,
        system_prompt: str,
        user_message: str,
        **kwargs
    ) -> str:
        """
        간편한 채팅 인터페이스
        
        Args:
            system_prompt: 시스템 프롬프트
            user_message: 사용자 메시지
            
        Returns:
            응답 문자열
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]
        return await self.invoke(messages, **kwargs)
    
    def get_model_info(self) -> Dict[str, Any]:
        """모델 정보 반환"""
        return {
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }


@lru_cache()
def get_llm_service(
    model: str = "gpt-4.1-mini",
    temperature: float = 0.3
) -> LLMService:
    """LLM 서비스 싱글톤 반환"""
    return LLMService(model=model, temperature=temperature)
