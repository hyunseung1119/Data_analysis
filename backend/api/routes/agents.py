"""
Agents Routes - Agent Status and Management API
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agents.registry import AgentRegistry


router = APIRouter()


class AgentInfo(BaseModel):
    """에이전트 정보 모델"""
    name: str
    description: str
    is_available: bool
    config: Dict[str, Any] = {}


class AgentListResponse(BaseModel):
    """에이전트 목록 응답"""
    agents: List[AgentInfo]
    total: int


@router.get("", response_model=AgentListResponse)
async def list_agents():
    """
    등록된 에이전트 목록 조회
    """
    agent_names = AgentRegistry.list_agents()
    agents = []
    
    for name in agent_names:
        info = AgentRegistry.get_agent_info(name)
        if info:
            agents.append(AgentInfo(
                name=name,
                description=info.get("config", {}).get("description", ""),
                is_available=True,
                config=info.get("config", {}),
            ))
    
    return AgentListResponse(agents=agents, total=len(agents))


@router.get("/{agent_name}")
async def get_agent(agent_name: str):
    """
    특정 에이전트 정보 조회
    """
    if not AgentRegistry.is_registered(agent_name):
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")
    
    info = AgentRegistry.get_agent_info(agent_name)
    return {
        "name": agent_name,
        "info": info,
        "status": "available",
    }


@router.get("/{agent_name}/status")
async def get_agent_status(agent_name: str):
    """
    에이전트 상태 조회
    """
    if not AgentRegistry.is_registered(agent_name):
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")
    
    info = AgentRegistry.get_agent_info(agent_name)
    
    return {
        "name": agent_name,
        "status": "ready",
        "has_instance": info.get("has_instance", False) if info else False,
        "last_execution": None,  # TODO: Track this
    }
