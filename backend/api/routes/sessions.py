"""
Sessions Routes - Session Management API
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime


router = APIRouter()


# In-memory session storage (replace with DB in production)
_sessions: Dict[str, Dict[str, Any]] = {}


class SessionInfo(BaseModel):
    """세션 정보 모델"""
    session_id: str
    created_at: str
    message_count: int
    last_activity: str


class CreateSessionResponse(BaseModel):
    """세션 생성 응답"""
    session_id: str
    created_at: str


@router.get("")
async def list_sessions():
    """
    세션 목록 조회
    """
    sessions = []
    for sid, data in _sessions.items():
        sessions.append(SessionInfo(
            session_id=sid,
            created_at=data.get("created_at", ""),
            message_count=len(data.get("messages", [])),
            last_activity=data.get("last_activity", ""),
        ))
    
    return {"sessions": sessions, "total": len(sessions)}


@router.post("", response_model=CreateSessionResponse)
async def create_session():
    """
    새 세션 생성
    """
    import uuid
    session_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    
    _sessions[session_id] = {
        "created_at": now,
        "last_activity": now,
        "messages": [],
    }
    
    return CreateSessionResponse(session_id=session_id, created_at=now)


@router.get("/{session_id}")
async def get_session(session_id: str):
    """
    세션 정보 조회
    """
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    data = _sessions[session_id]
    return {
        "session_id": session_id,
        "created_at": data.get("created_at"),
        "last_activity": data.get("last_activity"),
        "message_count": len(data.get("messages", [])),
    }


@router.get("/{session_id}/messages")
async def get_session_messages(session_id: str):
    """
    세션 메시지 히스토리 조회
    """
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"messages": _sessions[session_id].get("messages", [])}


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """
    세션 삭제
    """
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    del _sessions[session_id]
    return {"status": "deleted", "session_id": session_id}
