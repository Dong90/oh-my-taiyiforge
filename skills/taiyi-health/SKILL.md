---
name: taiyi-health
description: TaiyiForge 辅助 — 代码库健康巡检。四端通用。
paradigm: Scout
---

# taiyi-health — 健康巡检

## 场景
周期性/里程碑前/接手陌生项目/重构决策前

## 步骤

### 1. 生产代码6维抽样(R1-R6)
抽5个最近改动模块按6维打分

### 2. 冗余巡检
重复代码块(grep>=5行)/未用导出/死代码/未用依赖

### 3. 测试6维抽样(T1-T6)
抽5个测试文件

### 4. 综合分
🔴-10/🟡-3/🟢-1。第二次跑须与上次对比

### 5. 反哺
🔴→health-fix CHANGE | 🟡→CONTEXT技术债 | 🟢→LESSONS | 未用依赖→禁动清单

## 禁止
- 直接改代码
- 开多个fix CHANGE(所有Critical合并1个)
