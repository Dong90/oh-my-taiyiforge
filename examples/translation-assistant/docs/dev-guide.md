# 开发指南

## 项目结构
```
translation-assistant/
├── agent/backend/    # FastAPI 后端
├── agent/frontend/   # 原生 HTML/JS 前端
├── Dockerfile        # 容器镜像
├── docker-compose.yml
└── docs/             # 文档
```

## 本地运行
```bash
cd agent/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## 添加新翻译方向
1. 在 `strategies/` 下创建新策略类
2. 继承 `TranslationStrategy`
3. 实现 `translate()` 方法
4. 在 `TranslationService._get_strategy()` 注册
