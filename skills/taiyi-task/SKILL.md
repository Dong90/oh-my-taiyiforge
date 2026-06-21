---
name: taiyi-task
description: TaiyiForge 第5阶段 — 任务拆解，TASK.md。四端通用。
paradigm: Navigator
---

# taiyi-task — 任务拆解

## 每任务7字段
id/name/read_files/write_files/action/verify/done

## read_files vs write_files边界
- read_files: 要修改的文件+要参考的既有模块
- write_files: 严格在DESIGN范围内
- 禁动清单文件不可写

## 波次并行
Wave1: T01[P] T02[P] → Wave2: T03(依赖T01)

## 禁止
- 一个切片改5个无关目录
- verify写"代码写好"
- write_files含禁动清单
