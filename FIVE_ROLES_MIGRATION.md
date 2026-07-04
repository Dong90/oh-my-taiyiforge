# TaiyiForge Five Roles Migration Guide

**完整的五模块分离方案与 Git 仓库初始化指南**

---

## 📋 快速总览

| 模块 | GitHub 仓库 | 职责 | 发布 |
|------|----------|------|------|
| **Prototyper** | `Dong90/oh-my-Prototyper` | 工作流定义、状态机、质量门禁 | `@taiyi/prototyper` |
| **Builder** | `Dong90/oh-my-Builder` | 代码执行、AI 集成、技能库 | `@taiyi/builder` |
| **Sweeper** | `Dong90/oh-my-Sweeper` | 性能优化、技术债、重构 | `@taiyi/sweeper` |
| **Grower** | `Dong90/oh-my-Grower` | 插件系统、生态扩展 | `@taiyi/grower` |
| **Maintainer** | `Dong90/oh-my-Maintainer` | CI/CD、发布、文档、监控 | `@taiyi/maintainer` |

---

## 🚀 一键创建所有仓库

```bash
#!/bin/bash
# 创建五个仓库

REPOS=(
  "oh-my-Prototyper:Workflow skeleton, state machine, quality gates"
  "oh-my-Builder:Code execution engine for AI-driven development"
  "oh-my-Sweeper:Performance optimization, refactoring, and tech debt management"
  "oh-my-Grower:Plugin system and ecosystem extensions"
  "oh-my-Maintainer:CI/CD, release, documentation, and monitoring"
)

for repo_info in "${REPOS[@]}"; do
  IFS=':' read -r repo desc <<< "$repo_info"
  
  echo "📦 Creating $repo..."
  gh repo create Dong90/$repo \
    --public \
    --description="$desc" \
    --gitignore=Node \
    --license=mit \
    --clone=false
  
  sleep 1
done

echo "✅ All repositories created!"
```

**或逐个创建：**

```bash
gh repo create Dong90/oh-my-Prototyper --public --description="Workflow skeleton definition" --gitignore=Node --license=mit
gh repo create Dong90/oh-my-Builder --public --description="Code execution engine" --gitignore=Node --license=mit
gh repo create Dong90/oh-my-Sweeper --public --description="Optimization and refactoring" --gitignore=Node --license=mit
gh repo create Dong90/oh-my-Grower --public --description="Plugin system" --gitignore=Node --license=mit
gh repo create Dong90/oh-my-Maintainer --public --description="CI/CD and maintenance" --gitignore=Node --license=mit
```

---

## 1️⃣ oh-my-Prototyper

**角色**：原型师 - 定义工作流骨架与质量标准

### Git 初始化

```bash
mkdir oh-my-Prototyper
cd oh-my-Prototyper
git init
git remote add origin https://github.com/Dong90/oh-my-Prototyper.git
```

### 目录结构

```
oh-my-Prototyper/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── publish.yml
│   └── ISSUE_TEMPLATE/
├── src/
│   ├── core/
│   │   ├── workflow-manifest.ts       # 九阶段定义真源
│   │   ├── phases.ts                  # Phase 枚举
│   │   ├── state-machine.ts           # 状态流转
│   │   ├── context-generator.ts       # 上下文生成
│   │   └── artifact-validator.ts      # 工件校验
│   ├── gates/
│   │   ├── human-gate.ts              # 人工审批
│   │   ├── quality-gate.ts            # 五维门禁
│   │   ├── delivery-gate.ts           # 交付门控
│   │   └── types.ts                   # 接口定义
│   ├── contracts/
│   │   ├── change.ts
│   │   ├── requirement.ts
│   │   ├── design.ts
│   │   ├── task.ts
│   │   ├── test.ts
│   │   └── review.ts
│   └── index.ts                       # 导出入口
├── config/
│   ├── phases.yaml                    # 流程定义
│   ├── quality-gate.yaml              # 质量维度
│   └── profiles.yaml                  # 配置文件
├── templates/
│   ├── CHANGE.md.hbs
│   ├── REQUIREMENT.md.hbs
│   ├── DESIGN.md.hbs
│   ├── TASK.md.hbs
│   ├── TEST.md.hbs
│   ├── REVIEW.md.hbs
│   └── PHASE-CONTEXT.md.hbs
├── tests/
│   ├── state-machine.test.ts
│   ├── gates.test.ts
│   └── contracts.test.ts
├── docs/
│   ├── api.md
│   ├── workflow.md
│   └── quality-gates.md
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
├── LICENSE
├── .gitignore
└── CONTRIBUTING.md
```

### package.json

```json
{
  "name": "@taiyi/prototyper",
  "version": "1.0.0",
  "description": "Workflow skeleton definition and state machine for TaiyiForge",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./gates": "./dist/gates/index.js",
    "./contracts": "./dist/contracts/index.js"
  },
  "files": ["dist", "config", "templates", "LICENSE", "README.md"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": ["taiyi", "prototyper", "workflow", "state-machine"],
  "repository": {
    "type": "git",
    "url": "https://github.com/Dong90/oh-my-Prototyper.git"
  },
  "dependencies": {
    "handlebars": "^4.7.9",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/node": "^26.0.0",
    "typescript": "^6.0.3",
    "vitest": "^4.1.9"
  }
}
```

### 初始化命令

```bash
# Clone 并初始化
git clone https://github.com/Dong90/oh-my-Prototyper.git
cd oh-my-Prototyper

# 创建目录结构
mkdir -p src/{core,gates,contracts} config templates tests docs .github/workflows

# 初始化 Node 项目
npm init -y
npm install

# 首次提交
git add .
git commit -m "chore: init Prototyper with workflow skeleton"
git branch -M main
git push -u origin main
```

---

## 2️⃣ oh-my-Builder

**角色**：构建者 - 代码执行与 AI 集成

### Git 初始化

```bash
mkdir oh-my-Builder
cd oh-my-Builder
git init
git remote add origin https://github.com/Dong90/oh-my-Builder.git
```

### 目录结构

```
oh-my-Builder/
├── .github/workflows/
│   ├── ci.yml
│   └── publish.yml
├── src/
│   ├── ai-integration/
│   │   ├── claude-executor.ts         # Claude Code 适配
│   │   ├── codex-executor.ts          # Codex 适配
│   │   ├── cursor-adapter.ts          # Cursor 适配
│   │   ├── opencode-handler.ts        # OpenCode 插件
│   │   └── executor-base.ts
│   ├── phases/
│   │   ├── dev-runner.ts              # dev 阶段执行
│   │   ├── test-runner.ts             # test 阶段执行
│   │   └── phase-executor.ts
│   ├── skills/
│   │   ├── skill-loader.ts
│   │   ├── skill-registry.ts
│   │   └── skill-validator.ts
│   ├── env/
│   │   ├── env-manager.ts
│   │   ├── dependency-resolver.ts
│   │   └── sandbox.ts
│   ├── gates/
│   │   └── gate-checker.ts
│   └── index.ts
├── skills/
│   ├── taiyi-new/SKILL.md
│   ├── taiyi-write/SKILL.md
│   ├── taiyi-apply/SKILL.md
│   ├── taiyi-continue/SKILL.md
│   └── ... (29 skills)
├── templates/
│   ├── tdd-test.template.ts
│   ├── code-scaffold.template.ts
│   └── env.template.js
├── tests/
│   ├── ai-integration.test.ts
│   ├── phases.test.ts
│   └── skills.test.ts
├── docs/
│   ├── api.md
│   ├── skills.md
│   └── integrations.md
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
├── LICENSE
├── .gitignore
└── CONTRIBUTING.md
```

### package.json

```json
{
  "name": "@taiyi/builder",
  "version": "1.0.0",
  "description": "Code execution engine for AI-driven development",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./skills": "./dist/skills/index.js",
    "./phases": "./dist/phases/index.js"
  },
  "files": ["dist", "skills", "templates", "LICENSE", "README.md"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": ["taiyi", "builder", "code-execution", "ai-integration"],
  "repository": {
    "type": "git",
    "url": "https://github.com/Dong90/oh-my-Builder.git"
  },
  "dependencies": {
    "@taiyi/prototyper": "^1.0.0",
    "@modelcontextprotocol/sdk": "^1.29.0",
    "handlebars": "^4.7.9"
  },
  "devDependencies": {
    "@types/node": "^26.0.0",
    "typescript": "^6.0.3",
    "vitest": "^4.1.9"
  }
}
```

### 初始化命令

```bash
git clone https://github.com/Dong90/oh-my-Builder.git
cd oh-my-Builder

mkdir -p src/{ai-integration,phases,skills,env,gates} skills templates tests docs .github/workflows

npm init -y
npm install
npm install @taiyi/prototyper @modelcontextprotocol/sdk

git add .
git commit -m "chore: init Builder with AI execution engine"
git branch -M main
git push -u origin main
```

---

## 3️⃣ oh-my-Sweeper

**角色**：收尾者 - 性能优化与技术债管理

### Git 初始化 & 目录结构

```bash
git clone https://github.com/Dong90/oh-my-Sweeper.git
cd oh-my-Sweeper

mkdir -p src/{analysis,optimization,rules,reporter} config tests docs .github/workflows
```

### 核心目录树

```
oh-my-Sweeper/
├── src/
│   ├── analysis/
│   │   ├── performance-analyzer.ts
│   │   ├── debt-detector.ts
│   │   ├── complexity-meter.ts
│   │   └── duplication-finder.ts
│   ├── optimization/
│   │   ├── refactor-engine.ts
│   │   ├── token-optimizer.ts
│   │   ├── caching-advisor.ts
│   │   └── resource-optimizer.ts
│   ├── rules/
│   │   ├── clean-code-rules.ts
│   │   ├── performance-rules.ts
│   │   ├── security-rules.ts
│   │   └── anti-patterns.ts
│   ├── reporter/
│   │   ├── report-generator.ts
│   │   └── recommendation-engine.ts
│   └── index.ts
├── config/
│   ├── sweeping-rules.yaml
│   └── optimization-profiles.yaml
├── tests/
│   ├── analysis.test.ts
│   ├── optimization.test.ts
│   └── reporter.test.ts
├── docs/
│   ├── api.md
│   ├── analysis.md
│   └── optimization.md
└── package.json
```

### package.json

```json
{
  "name": "@taiyi/sweeper",
  "version": "1.0.0",
  "description": "Optimization, refactoring, and tech debt management",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./analysis": "./dist/analysis/index.js",
    "./optimization": "./dist/optimization/index.js"
  },
  "files": ["dist", "config", "LICENSE", "README.md"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": ["taiyi", "sweeper", "optimization", "refactoring"],
  "repository": {
    "type": "git",
    "url": "https://github.com/Dong90/oh-my-Sweeper.git"
  },
  "dependencies": {
    "@taiyi/prototyper": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^26.0.0",
    "typescript": "^6.0.3",
    "vitest": "^4.1.9"
  }
}
```

### 初始化

```bash
npm init -y && npm install @taiyi/prototyper
git add . && git commit -m "chore: init Sweeper with optimization engine"
git push -u origin main
```

---

## 4️⃣ oh-my-Grower

**角色**：增长者 - 插件系统与生态扩展

### Git 初始化 & 目录结构

```bash
git clone https://github.com/Dong90/oh-my-Grower.git
cd oh-my-Grower

mkdir -p src/{plugin-system,integrations,extensions,marketplace} plugins/example-plugin plugins/template-plugin tests docs .github/workflows
```

### 核心目录树

```
oh-my-Grower/
├── src/
│   ├── plugin-system/
│   │   ├── plugin-loader.ts
│   │   ├── plugin-api.ts
│   │   ├── plugin-registry.ts
│   │   └── plugin-validator.ts
│   ├── integrations/
│   │   ├── cursor-plugin/
│   │   ├── vscode-plugin/
│   │   ├── cli-tool/
│   │   └── framework-adapters/
│   ├── extensions/
│   │   ├── custom-gates/
│   │   ├── custom-skills/
│   │   ├── language-support/
│   │   └── framework-support/
│   ├── marketplace/
│   │   ├── plugin-registry-api.ts
│   │   └── plugin-discovery.ts
│   └── index.ts
├── plugins/
│   ├── example-plugin/
│   │   ├── src/
│   │   ├── package.json
│   │   └── README.md
│   └── template-plugin/
│       ├── src/
│       ├── package.json
│       └── README.md
├── tests/
│   ├── plugin-system.test.ts
│   ├── integrations.test.ts
│   └── extensions.test.ts
└── package.json
```

### package.json

```json
{
  "name": "@taiyi/grower",
  "version": "1.0.0",
  "description": "Plugin system and ecosystem extensions",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./plugin-api": "./dist/plugin-system/plugin-api.js"
  },
  "files": ["dist", "plugins", "LICENSE", "README.md"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": ["taiyi", "grower", "plugin-system", "extensions"],
  "repository": {
    "type": "git",
    "url": "https://github.com/Dong90/oh-my-Grower.git"
  },
  "dependencies": {
    "@taiyi/prototyper": "^1.0.0",
    "@taiyi/builder": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^26.0.0",
    "typescript": "^6.0.3",
    "vitest": "^4.1.9"
  }
}
```

### 初始化

```bash
npm init -y && npm install @taiyi/prototyper @taiyi/builder
git add . && git commit -m "chore: init Grower with plugin system"
git push -u origin main
```

---

## 5️⃣ oh-my-Maintainer

**角色**：维护者 - CI/CD、发布、文档、监控

### Git 初始化 & 目录结构

```bash
git clone https://github.com/Dong90/oh-my-Maintainer.git
cd oh-my-Maintainer

mkdir -p src/{ci-cd,version-control,docs,monitoring,security} .github/workflows scripts tests docs
```

### 核心目录树

```
oh-my-Maintainer/
├── src/
│   ├── ci-cd/
│   │   ├── github-actions-config.ts
│   │   ├── deployment-pipeline.ts
│   │   ├── release-manager.ts
│   │   └── quality-checker.ts
│   ├── version-control/
│   │   ├── changelog-generator.ts
│   │   ├── semantic-versioning.ts
│   │   ├── release-notes-builder.ts
│   │   └── tag-manager.ts
│   ├── docs/
│   │   ├── doc-generator.ts
│   │   ├── api-documenter.ts
│   │   ├── example-builder.ts
│   │   └── changelog-formatter.ts
│   ├── monitoring/
│   │   ├── health-check.ts
│   │   ├── metrics-collector.ts
│   │   ├── performance-monitor.ts
│   │   └── alert-manager.ts
│   ├── security/
│   │   ├── vulnerability-scanner.ts
│   │   ├── dependency-audit.ts
│   │   └── security-report.ts
│   └── index.ts
├── .github/workflows/
│   ├── ci.yml
│   ├── release.yml
│   ├── security-scan.yml
│   └── docs-deploy.yml
├── scripts/
│   ├── release.sh
│   ├── generate-docs.sh
│   └── ci.sh
├── tests/
│   ├── release.test.ts
│   ├── docs.test.ts
│   └── monitoring.test.ts
└── package.json
```

### package.json

```json
{
  "name": "@taiyi/maintainer",
  "version": "1.0.0",
  "description": "CI/CD, release management, documentation, and monitoring",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./release": "./dist/version-control/index.js",
    "./monitoring": "./dist/monitoring/index.js"
  },
  "files": ["dist", "scripts", ".github", "LICENSE", "README.md"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "release": "node dist/version-control/release-manager.js",
    "generate:docs": "node scripts/generate-docs.sh",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": ["taiyi", "maintainer", "ci-cd", "release", "monitoring"],
  "repository": {
    "type": "git",
    "url": "https://github.com/Dong90/oh-my-Maintainer.git"
  },
  "dependencies": {
    "@taiyi/prototyper": "^1.0.0",
    "@taiyi/builder": "^1.0.0",
    "@taiyi/sweeper": "^1.0.0",
    "@taiyi/grower": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^26.0.0",
    "typescript": "^6.0.3",
    "vitest": "^4.1.9"
  }
}
```

### 初始化

```bash
npm init -y && npm install @taiyi/prototyper @taiyi/builder @taiyi/sweeper @taiyi/grower
git add . && git commit -m "chore: init Maintainer with CI/CD and release management"
git push -u origin main
```

---

## 🔄 模块间依赖关系

```
@taiyi/prototyper (零依赖，核心基础)
    ↓
    ├── @taiyi/builder (依赖 Prototyper)
    ├── @taiyi/sweeper (依赖 Prototyper)
    └── @taiyi/grower (依赖 Prototyper + Builder)
        └── @taiyi/maintainer (依赖全部)
```

---

## 📦 发布流程

### 1. Prototyper 首次发布

```bash
cd oh-my-Prototyper
npm version patch
npm publish --access public
```

### 2. Builder / Sweeper / Grower 依次发布

```bash
cd oh-my-Builder
npm install @taiyi/prototyper@latest
npm version patch
npm publish --access public
```

### 3. Maintainer 最后发布

```bash
cd oh-my-Maintainer
npm install @taiyi/prototyper@latest @taiyi/builder@latest @taiyi/sweeper@latest @taiyi/grower@latest
npm version patch
npm publish --access public
```

---

## 🎯 GitHub 配置清单

### 每个仓库需要配置

- [ ] **Branch protection rules**：`main` 分支
  - 需要 PR review (1 approver)
  - 需要 CI 通过
  - 禁止 force push

- [ ] **Secrets & Vars**（Maintainer 仓库）：
  - `NPM_TOKEN` (for publishing)
  - `GITHUB_TOKEN` (auto-generated)

- [ ] **Topics**：
  ```
  taiyi, workflow, ai-development, agent-skills, typescript
  ```

- [ ] **Description**：对应角色说明

- [ ] **README**：包含五模块导航

---

## 📝 示例：全量初始化脚本

```bash
#!/bin/bash
set -e

MODULES=(
  "oh-my-Prototyper:src/{core,gates,contracts} config templates"
  "oh-my-Builder:src/{ai-integration,phases,skills,env,gates} skills templates"
  "oh-my-Sweeper:src/{analysis,optimization,rules,reporter} config"
  "oh-my-Grower:src/{plugin-system,integrations,extensions,marketplace} plugins/{example-plugin,template-plugin}"
  "oh-my-Maintainer:src/{ci-cd,version-control,docs,monitoring,security} scripts"
)

for module_info in "${MODULES[@]}"; do
  IFS=':' read -r module dirs <<< "$module_info"
  
  echo "🚀 Setting up $module..."
  
  if [ ! -d "$module" ]; then
    git clone https://github.com/Dong90/$module.git
  fi
  
  cd "$module"
  
  # Create directories
  mkdir -p tests docs .github/workflows $dirs
  
  # Initialize npm if not exists
  if [ ! -f "package.json" ]; then
    npm init -y
  fi
  
  # Create base files
  touch src/index.ts
  touch tsconfig.json vitest.config.ts
  echo "MIT" > LICENSE
  echo "# $module" > README.md
  
  # Initial commit
  git add .
  git commit -m "chore: init $module" || true
  git branch -M main
  git push -u origin main || true
  
  cd ..
  
  echo "✅ $module initialized"
  sleep 1
done

echo "🎉 All modules initialized!"
```

---

## 🔗 互联导航

每个 README.md 顶部都应包含：

```markdown
## Part of oh-my Ecosystem

| Component | Role |
|-----------|------|
| [oh-my-Prototyper](https://github.com/Dong90/oh-my-Prototyper) | Workflow Definition |
| [oh-my-Builder](https://github.com/Dong90/oh-my-Builder) | Code Execution |
| [oh-my-Sweeper](https://github.com/Dong90/oh-my-Sweeper) | Optimization |
| [oh-my-Grower](https://github.com/Dong90/oh-my-Grower) | Extensions |
| [oh-my-Maintainer](https://github.com/Dong90/oh-my-Maintainer) | CI/CD & Release |
```

---

## ✅ 检查清单

- [ ] 创建五个 GitHub 仓库
- [ ] 初始化每个仓库的目录结构
- [ ] 创建 package.json 并安装依赖
- [ ] 设置 branch protection rules
- [ ] 配置 CI workflows
- [ ] 发布到 npm registry
- [ ] 更新 oh-my-taiyiforge README（指向五个模块）
- [ ] 创建生态文档

---

需要帮助创建任何特定的初始化脚本或配置文件吗？
