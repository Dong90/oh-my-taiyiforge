import path from "node:path";

/** 项目内 TaiyiForge 运行时根目录（工件与 state.json） */
export function resolveTaiyiRoot(workspaceDir: string): string {
  const base = process.env.TAIYI_WORKSPACE?.trim() || workspaceDir;
  return path.join(path.resolve(base), ".taiyi");
}
