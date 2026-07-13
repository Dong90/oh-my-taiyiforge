#!/bin/bash
# 🔧 初始化五个 TaiyiForge 角色仓库的目录结构
# 用法: bash init-repos.sh

set -e

OWNER="Dong90"
BASE_DIR="${PWD}/taiyi-repos"

# 初始化配置
declare -A REPO_CONFIGS=(
  ["oh-my-Prototyper"]="Prototyper:src/{core,gates,contracts}:config:templates"
  ["oh-my-Builder"]="Builder:src/{ai-integration,phases,skills,env,gates}:skills:templates"
  ["oh-my-Sweeper"]="Sweeper:src/{analysis,optimization,rules,reporter}:config"
  ["oh-my-Grower"]="Grower:src/{plugin-system,integrations,extensions,marketplace}:plugins/{example-plugin,template-plugin}"
  ["oh-my-Maintainer"]="Maintainer:src/{ci-cd,version-control,docs,monitoring,security}:scripts"
)

# 创建基础目录
mkdir -p "$BASE_DIR"
cd "$BASE_DIR"

for repo_name in "${!REPO_CONFIGS[@]}"; do
  config="${REPO_CONFIGS[$repo_name]}"
  IFS=':' read -r role_name dirs_str <<< "$config"
  
  echo "🚀 Initializing $repo_name..."
  
  # Clone 或进入仓库
  if [ ! -d "$repo_name" ]; then
    git clone https://github.com/$OWNER/$repo_name.git
  fi
  
  cd "$repo_name"
  
  # 清理旧的初始化文件
  rm -f README.md package.json tsconfig.json vitest.config.ts .gitignore LICENSE
  
  # 创建目录结构
  mkdir -p tests docs .github/workflows
  
  # 解析并创建源代码目录
  IFS=':' read -ra DIR_ARRAY <<< "$dirs_str"
  for dir_pattern in "${DIR_ARRAY[@]}"; do
    mkdir -p "$dir_pattern"
  done
  
  # 创建基础文件
  cat > src/index.ts << 'EOF'
/**
 * TaiyiForge Five Roles
 * This module is part of the oh-my ecosystem
 */

export * from './core';

// TODO: Add module exports
EOF

  cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF

  cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
EOF

  cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnpm-store/

# Build
dist/
*.tsbuildinfo

# Test
coverage/
.nyc_output/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
EOF

  cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2026 TaiyiForge contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

  cat > README.md << EOF
# oh-my-$role_name

Part of the **oh-my** TaiyiForge ecosystem.

## Quick Start

\`\`\`bash
git clone https://github.com/$OWNER/$repo_name.git
cd $repo_name
npm install
npm run build
\`\`\`

## Documentation

- [API Reference](docs/api.md)
- [Contributing](CONTRIBUTING.md)

## License

MIT

## Part of oh-my Ecosystem

| Component | Role |
|-----------|------|
| [oh-my-Prototyper](https://github.com/$OWNER/oh-my-Prototyper) | Workflow Definition |
| [oh-my-Builder](https://github.com/$OWNER/oh-my-Builder) | Code Execution |
| [oh-my-Sweeper](https://github.com/$OWNER/oh-my-Sweeper) | Optimization |
| [oh-my-Grower](https://github.com/$OWNER/oh-my-Grower) | Extensions |
| [oh-my-Maintainer](https://github.com/$OWNER/oh-my-Maintainer) | CI/CD & Release |
EOF

  cat > CONTRIBUTING.md << 'EOF'
# Contributing

Thank you for contributing to TaiyiForge!

## Development Setup

```bash
npm install
npm run build
npm test
```

## Commit Convention

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style
- `refactor:` Code refactoring
- `test:` Add tests
- `chore:` Build/dependency updates

## PR Process

1. Fork and create a feature branch
2. Make your changes and add tests
3. Ensure all tests pass: `npm test`
4. Submit a PR with clear description

EOF

  cat > package.json << 'EOF'
{
  "name": "@taiyi/MODULE",
  "version": "0.1.0",
  "description": "TaiyiForge MODULE role",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "LICENSE", "README.md"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": ["taiyi", "workflow", "ai-development"],
  "repository": {
    "type": "git",
    "url": "https://github.com/$OWNER/$repo_name.git"
  },
  "devDependencies": {
    "@types/node": "^26.0.0",
    "typescript": "^6.0.3",
    "vitest": "^4.1.9"
  }
}
EOF

  # 创建 docs
  mkdir -p docs
  cat > docs/api.md << 'EOF'
# API Reference

TODO: Add API documentation
EOF

  # 创建 GitHub Actions workflow
  mkdir -p .github/workflows
  cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run build
      - run: npm test
EOF

  cat > .github/workflows/publish.yml << 'EOF'
name: Publish

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20.x
          registry-url: https://registry.npmjs.org/
      - run: npm ci
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
EOF

  # Git 初始化
  if [ ! -d ".git" ]; then
    git init
    git remote add origin https://github.com/$OWNER/$repo_name.git
  fi
  
  git add .
  git commit -m "chore: init $repo_name with directory structure and base files" -m "- Add src/, tests/, docs/ structure
- Add TypeScript configuration
- Add package.json template
- Add GitHub Actions workflows
- Add LICENSE and README" || echo "   ⚠️  Nothing to commit"
  
  git branch -M main
  git push -u origin main --force 2>/dev/null || echo "   ⚠️  Push failed (might need git auth)"
  
  cd ..
  echo "   ✅ $repo_name initialized"
  echo ""
done

echo "🎉 All repositories initialized!"
echo ""
echo "📊 Repository structure:"
ls -la "$BASE_DIR"
echo ""
echo "📝 Next steps:"
echo "   1. Update package.json with correct module names and dependencies"
echo "   2. Add your code to src/"
echo "   3. Run: npm publish --access public"
echo ""
