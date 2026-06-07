---
description: "TaiyiForge /taiyi:land — gstack land-and-deploy: merge PR, CI, deploy, canary"
argument-hint: "[optional PR number or branch]"
---
User invoked **$taiyi-land** (= `/taiyi:land`). **合并 + 部署 + 生产验证** — 加载 **gstack `land-and-deploy`** Skill。

## 前置

- 通常先有 `/taiyi:ship` 创建的 PR
- CI 绿；review 与 `/taiyi:verify` 已过

## 执行

1. 加载 **gstack `land-and-deploy`**（见 gstack 加载协议）。
2. 按 Skill：merge PR → 等 CI/deploy → **canary** 验证生产健康。
3. 部署成功后：`/taiyi:continue` integration（若尚未）→ `/taiyi:archive`

未配置 deploy：先 gstack **`setup-deploy`**，或只做 merge 部分并告知用户。

{{TAIYI_STAGE_PROTOCOL}}

{{GSTACK_INVOKE}}
