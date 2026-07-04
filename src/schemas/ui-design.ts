import { z } from "zod";

const StylingContract = z.object({
  scheme: z.string().describe("CSS 方案，如 Tailwind / CSS Modules / styled-components"),
  no_inline_styles: z.boolean().default(true).describe("禁止内联样式（动态值通过 CSS 变量例外）"),
  theme_var_only: z.boolean().default(true).describe("颜色/间距/字体仅用主题变量"),
  exceptions: z.string().optional().describe("例外说明"),
});

export const UiDesignSchema = z.object({
  title: z.string().describe("设计标题"),
  scope: z.string().describe("UI 范围说明"),
  styling_contract: StylingContract.optional().describe("样式契约：CSS 方案 + 内联禁令 + 主题变量规则"),
  is_cli_only: z.boolean().optional().describe("是否仅 CLI"),
  component_name: z.string().optional().describe("主组件名称（CLI-only 时填 N/A）"),
  states: z.array(
    z.object({
      name: z.string().describe("状态名称，如 loading/empty/error"),
      description: z.string().describe("状态表现描述"),
    })
  ).optional(),
  accessibility: z.array(z.string()).optional().describe("无障碍检查清单"),
  links: z.array(z.string()).optional().describe("设计稿 / Figma 链接"),
}).strict();

export type UiDesignSpec = z.infer<typeof UiDesignSchema>;
