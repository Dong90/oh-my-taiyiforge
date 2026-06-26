# Todo Fullstack — TaiyiForge 全栈示例

用 TaiyiForge `/taiyi:plan` + 九阶段流程交付一个全栈 Todo App。

## 快速体验

```bash
# 1. 安装依赖
cd examples/todo-fullstack && npm install

# 2. 启动后端 API（新终端）
npm run dev

# 3. 浏览器打开 frontend/index.html
open ../frontend/index.html
```

## 项目结构

```
todo-fullstack/
├── PLAN.md                 # /taiyi:plan 拆解计划（3 个 change）
├── package.json            # 根 workspace
├── backend/
│   ├── src/
│   │   ├── index.js        # Express 服务入口
│   │   ├── store.js        # 内存存储
│   │   └── routes/todos.js # CRUD 4 端点
│   └── test/api.test.js    # API 单元测试（9 个 case）
├── frontend/
│   ├── index.html          # 主页面
│   ├── style.css           # 样式
│   ├── app.js              # 应用逻辑（API 调用 + DOM 渲染）
│   └── test/app.test.js    # 前端测试
└── e2e/smoke.test.js       # E2E 集成测试
```

## 按 TaiyiForge 流程交付

这个示例本身就是按 `/taiyi:plan` 拆解实现的：

| 步骤 | 操作 | 说明 |
|------|------|------|
| 1 | `/taiyi:plan` | 自动读取 README → 拆出 3 个 change（PLAN.md） |
| 2 | `/taiyi:new "todo-api"` | 后端 API 走 8 阶段（skip ui-design） |
| 3 | `/taiyi:new "todo-ui"` | 前端 UI 走 5 阶段（skip 需求/设计） |
| 4 | `/taiyi:new "todo-e2e"` | E2E 测试走 3 阶段 micro profile |
| 5 | 并行推进 1,2 → 3 | 依赖顺序：todo-e2e 等 todo-api 到 dev |
| 6 | `/taiyi:archive` 逐个归档 | 交付完成 |

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/todos` | 获取全部待办 |
| GET | `/api/todos/:id` | 获取单个 |
| POST | `/api/todos` | 创建（body: `{ title }`） |
| PUT | `/api/todos/:id` | 更新（body: `{ title?, completed? }`） |
| DELETE | `/api/todos/:id` | 删除 |
| GET | `/api/health` | 健康检查 |

## 测试

```bash
npm test            # 全部
npm run test:api    # 后端 9 个 case
npm run test:e2e    # E2E（自动启动后端）
```

## 作为一个 change 从头跑 E2E

```bash
cd /path/to/oh-my-taiyiforge
npm run build

# 在 todo-fullstack 内创建 change 并走九阶段
node scripts/taiyi-forge.sh status --path examples/todo-fullstack
```
