# 部署文档

## 本地开发
```bash
cd examples/translation-assistant
docker-compose up
```

## 生产环境
- 反向代理：Nginx
- 监控：Prometheus + Grafana
- 日志：ELK / Loki
- 编排：Docker Compose（小规模）/ Kubernetes（大规模）
