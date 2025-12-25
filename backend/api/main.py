"""
FastAPI Application Entry Point

Multi-Agent Decision Support System API
"""
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.routes import chat, agents, sessions
from api.middleware.logging import LoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 Multi-Agent Decision System starting...")
    
    # Import agents to trigger registration
    from agents.specialists import (
        LawExpertAgent, 
        CalculatorAgent, 
        RiskAnalystAgent, 
        StrategistAgent,
        DataAnalystAgent
    )
    from agents.registry import AgentRegistry
    print(f"✅ Registered agents: {AgentRegistry.list_agents()}")
    
    yield
    
    # Shutdown
    print("👋 Multi-Agent Decision System shutting down...")


def create_app() -> FastAPI:
    """Create and configure FastAPI application"""
    
    app = FastAPI(
        title="Multi-Agent Decision Support System",
        description="""
        세무/금융 도메인 복합 질문에 대해 여러 전문가 에이전트가 협업하여 
        종합 의사결정을 지원하는 시스템 API
        
        ## Agents
        - **LawExpert**: 법령 검색 및 해석
        - **Calculator**: 세금 계산 및 시뮬레이션
        - **RiskAnalyst**: 리스크 분석
        - **Strategist**: 종합 전략 수립
        """,
        version="1.0.0",
        lifespan=lifespan,
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Adjust in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Custom middleware
    app.add_middleware(LoggingMiddleware)
    
    # Routes
    from api.routes.analysis import core as analysis_core
    from api.routes.analysis import ab_test, business_metrics, ai_insights, charts, timeseries, segment, preprocessing, ai_preprocessing, code_generator, forecast, column_explain
    
    app.include_router(chat.router, prefix="/api", tags=["Chat"])
    app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
    app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
    
    # Analysis routes (modular)
    app.include_router(analysis_core.router, prefix="/api", tags=["Analysis"])
    app.include_router(ab_test.router, prefix="/api", tags=["A/B Test"])
    app.include_router(business_metrics.router, prefix="/api", tags=["Business Metrics"])
    app.include_router(ai_insights.router, prefix="/api", tags=["AI Insights"])
    app.include_router(charts.router, prefix="/api", tags=["Charts"])
    app.include_router(timeseries.router, prefix="/api", tags=["Time Series"])
    app.include_router(segment.router, prefix="/api", tags=["Segment"])
    app.include_router(preprocessing.router, prefix="/api", tags=["Preprocessing"])
    app.include_router(ai_preprocessing.router, prefix="/api", tags=["AI Preprocessing"])
    app.include_router(code_generator.router, prefix="/api", tags=["Code Generator"])
    app.include_router(forecast.router, prefix="/api", tags=["Forecast"])
    app.include_router(column_explain.router, prefix="/api", tags=["Column Explain"])
    
    @app.get("/")
    async def root():
        return {
            "service": "Multi-Agent Decision Support System",
            "version": "1.0.0",
            "status": "running",
        }
    
    @app.get("/health")
    async def health():
        return {"status": "healthy"}
    
    return app


# Create app instance
app = create_app()
