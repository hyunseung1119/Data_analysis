"""
AgentRegistry - Plugin pattern for dynamic agent registration

에이전트를 동적으로 등록하고 관리하는 레지스트리.
새 에이전트 추가 시 코드 변경 최소화.
"""
from typing import Dict, Type, List, Optional, Any
from .base import BaseAgent


class AgentRegistry:
    """
    에이전트 레지스트리 (Singleton Pattern + Plugin Pattern)
    
    Usage:
        @AgentRegistry.register("law_expert")
        class LawExpertAgent(BaseAgent):
            ...
            
        agent = AgentRegistry.get("law_expert", llm_service=llm)
    """
    
    _agents: Dict[str, Type[BaseAgent]] = {}
    _instances: Dict[str, BaseAgent] = {}
    _configs: Dict[str, Dict[str, Any]] = {}
    
    @classmethod
    def register(cls, name: str, config: Dict[str, Any] = None):
        """
        데코레이터로 에이전트 등록
        
        Args:
            name: 에이전트 고유 이름
            config: 에이전트 기본 설정
            
        Returns:
            데코레이터 함수
        """
        def decorator(agent_class: Type[BaseAgent]) -> Type[BaseAgent]:
            if not issubclass(agent_class, BaseAgent):
                raise TypeError(f"{agent_class} must inherit from BaseAgent")
            
            cls._agents[name] = agent_class
            cls._configs[name] = config or {}
            return agent_class
        return decorator
    
    @classmethod
    def get(
        cls, 
        name: str, 
        singleton: bool = True,
        **kwargs
    ) -> BaseAgent:
        """
        에이전트 인스턴스 반환
        
        Args:
            name: 에이전트 이름
            singleton: True면 싱글톤 인스턴스 반환
            **kwargs: 에이전트 생성자 인자
            
        Returns:
            BaseAgent 인스턴스
            
        Raises:
            ValueError: 등록되지 않은 에이전트
        """
        if name not in cls._agents:
            raise ValueError(f"Unknown agent: {name}. Available: {list(cls._agents.keys())}")
        
        if singleton and name in cls._instances:
            return cls._instances[name]
        
        # 기본 설정과 kwargs 병합
        merged_config = {**cls._configs.get(name, {}), **kwargs.get("config", {})}
        kwargs["config"] = merged_config
        
        # 기본 인자 설정
        if "name" not in kwargs:
            kwargs["name"] = name
        if "description" not in kwargs:
            kwargs["description"] = cls._configs.get(name, {}).get("description", "")
        
        instance = cls._agents[name](**kwargs)
        
        if singleton:
            cls._instances[name] = instance
        
        return instance
    
    @classmethod
    def list_agents(cls) -> List[str]:
        """등록된 에이전트 이름 목록"""
        return list(cls._agents.keys())
    
    @classmethod
    def get_all_configs(cls) -> Dict[str, Dict[str, Any]]:
        """모든 에이전트 설정 반환"""
        return cls._configs.copy()
    
    @classmethod
    def is_registered(cls, name: str) -> bool:
        """에이전트 등록 여부 확인"""
        return name in cls._agents
    
    @classmethod
    def clear(cls) -> None:
        """레지스트리 초기화 (테스트용)"""
        cls._agents.clear()
        cls._instances.clear()
        cls._configs.clear()
    
    @classmethod
    def remove_instance(cls, name: str) -> None:
        """싱글톤 인스턴스 제거"""
        if name in cls._instances:
            del cls._instances[name]
    
    @classmethod
    def get_agent_info(cls, name: str) -> Optional[Dict[str, Any]]:
        """에이전트 정보 반환"""
        if name not in cls._agents:
            return None
        
        return {
            "name": name,
            "class": cls._agents[name].__name__,
            "config": cls._configs.get(name, {}),
            "has_instance": name in cls._instances,
        }
