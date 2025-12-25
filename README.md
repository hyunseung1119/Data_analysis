<div align="center">

# 🤖 Multi-Agent Decision System

**AI 기반 데이터 분석 및 의사결정 지원 플랫폼**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![LangGraph](https://img.shields.io/badge/LangChain-LangGraph-1C3C3C?logo=langchain)](https://langchain.com)

[핵심 기능](#-핵심-기능) •
[시스템 아키텍처](#-시스템-아키텍처) •
[기술 스택](#-기술-스택) •
[핵심 구현](#-핵심-구현) •
[적용 이론](#-적용된-이론-및-기법)

</div>

---

## 🎯 프로젝트 개요

> **“데이터 분석의 민주화”**  
> 누구나 쉽게 전문적인 데이터 분석을 수행할 수 있는 AI 플랫폼

**Multi-Agent Decision System**은  
다중 AI 에이전트가 협력하여 복잡한 데이터 분석과 의사결정을 지원하는 **풀스택 AI 플랫폼**입니다.

### 💡 해결하고자 한 문제
- 데이터 분석에 필요한 **코딩 장벽 해소**
- **반복적인 EDA 작업 자동화**
- **분석 → 인사이트 → 액션** 사이클 단축
- **비개발자도 활용 가능한** 데이터 분석 도구 제공

### 📈 프로젝트 성과
| 지표 | 결과 |
|:---|:---|
| 분석 자동화 | CSV 업로드 → 10초 내 EDA 완료 |
| 지원 분석 유형 | 6개 (EDA, 시계열, 세그먼트, 상관관계, A/B 테스트, 예측) |
| AI 기능 | 자연어 코드 생성, 인사이트 자동 시각화 |
| 에이전트 수 | 5개 전문 분야별 AI 에이전트 |

---

## ✨ 핵심 기능

### 📊 자동 데이터 분석 파이프라인

| 기능 | 설명 | 핵심 기술 |
|:---|:---|:---|
| AI 컬럼 분석 | 컬럼 의미 및 분석 팁 자동 설명 | GPT-4 |
| EDA 대시보드 | 분포, 결측치, 중복 분석 | Pandas, NumPy |
| 시계열 분석 | 트렌드, 계절성, 예측 | Linear Regression |
| 세그먼트 분석 | 그룹 비교, ANOVA | SciPy |
| 상관관계 분석 | 히트맵, 상관계수 | Pandas |
| A/B 테스트 | 유의성 검정, 효과 크기 | T-test |

---

## 🤖 AI 자동화 기능

| 기능 | 사용자 경험 | 기술 |
|:---|:---|:---|
| AI 인사이트 | 주요 패턴 자동 발견 및 시각화 | GPT-4 |
| 전처리 진단 | 데이터 품질 이슈 자동 탐지 | Prompt Chain |
| 자연어 코드 생성 | 자연어 → Pandas 코드 | Few-shot Prompting |
| 원클릭 실행 | 안전한 코드 실행 | Sandboxed Execution |

---

## 🔮 예측 분석

| 기능 | 설명 |
|:---|:---|
| 시계열 예측 | 미래 값 + 95% 신뢰구간 |
| What-if 분석 | 변수 변화 영향 시뮬레이션 |
| 이상 탐지 | IQR / Z-score 기반 탐지 |

---

## 🏗 시스템 아키텍처


---

## 🛠 기술 스택

### Backend
- **FastAPI** – 비동기 처리, 자동 API 문서화
- **LangChain / LangGraph** – Multi-Agent 오케스트레이션
- **Pandas / NumPy / SciPy** – 데이터 분석 및 통계

### Frontend
- **React 18** – 컴포넌트 기반 UI
- **Vite** – 빠른 HMR
- **Recharts** – 데이터 시각화
- **TailwindCSS** – 유틸리티 기반 스타일링

### AI / ML
- **GPT-4** – 인사이트 및 코드 생성
- **ReAct Pattern** – Reasoning + Acting
- **Structured Output** – JSON 기반 출력

---

## 🔬 핵심 구현

### 자연어 → Pandas 코드 생성
```python
df['column'] = df['column'].fillna(df['column'].mean())
results = await asyncio.gather(
    agent.analyze(query) for agent in agents
)
pd.to_datetime(col, infer_datetime_format=True, errors="coerce")

multi_agent_decision/
├── backend/
│   ├── agents/
│   ├── api/routes/
│   └── services/
└── frontend/
    └── src/

git clone https://github.com/yourusername/multi-agent-decision.git
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8001

cd frontend
npm install
npm run dev


