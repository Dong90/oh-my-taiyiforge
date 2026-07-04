import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHelpCommand, type HelpOptions } from "../../packages/cli/src/commands/help.js";

function makeCmd(name: string, desc: string) {
  return { name, description: () => desc, outputHelp: vi.fn() };
}

/**
 * Commander v15 stores the registered callback in `_actionHandler(args)`.
 * `args` is an array whose length matches the number of registered parameters.
 * Wrapping it here lets tests invoke it directly.
 */
function invokeAction(cmd: any, rawArgs: any[]) {
  const handler = cmd._actionHandler;
  if (typeof handler !== "function") throw new Error("no action handler");
  return handler(rawArgs);
}

describe("createHelpCommand", () => {
  let commands: Map<string, any>;

  beforeEach(() => { commands = new Map(); });

  // ── Structure ──

  it("has name 'help'", () => {
    expect(createHelpCommand(commands).name()).toBe("help");
  });

  it("has description mentioning available commands", () => {
    expect(createHelpCommand(commands).description().toLowerCase()).toContain("available");
  });

  it("has optional [name] argument", () => {
    const cmd: any = createHelpCommand(commands);
    const args = cmd.registeredArguments || [];
    const names = args.map((a: any) => a.name?.() ?? a._name ?? "").filter(Boolean);
    expect(names).toContain("name");
  });

  it("has --verbose option", () => {
    const cmd: any = createHelpCommand(commands);
    const optNames = cmd.options.map((o: any) => o.long || o.name?.());
    expect(optNames.some((n: string) => String(n).includes("verbose"))).toBe(true);
  });

  // ── Action: list all commands ──

  it("lists all registered commands with descriptions", () => {
    commands.set("build", makeCmd("build", "Build project"));
    commands.set("test", makeCmd("test", "Run tests"));
    commands.set("deploy", makeCmd("deploy", "Deploy to prod"));

    const out: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((c: any) => { out.push(String(c)); return true; });

    const cmd: any = createHelpCommand(commands);
    invokeAction(cmd, [undefined]);

    const text = out.join("");
    expect(text).toContain("Available commands");
    expect(text).toContain("build");
    expect(text).toContain("Build project");
    expect(text).toContain("test");
    expect(text).toContain("Run tests");
    expect(text).toContain("deploy");
    expect(text).toContain("Deploy to prod");

    vi.restoreAllMocks();
  });

  it("handles empty commands map", () => {
    const out: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((c: any) => { out.push(String(c)); return true; });

    const cmd: any = createHelpCommand(commands);
    invokeAction(cmd, [undefined]);

    expect(out.join("")).toContain("No commands registered");
    vi.restoreAllMocks();
  });

  it("shows (no description) for empty description", () => {
    commands.set("mystery", makeCmd("mystery", ""));
    const out: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((c: any) => { out.push(String(c)); return true; });

    const cmd: any = createHelpCommand(commands);
    invokeAction(cmd, [undefined]);

    expect(out.join("")).toContain("(no description)");
    vi.restoreAllMocks();
  });

  it("aligns columns using max name width", () => {
    commands.set("a", makeCmd("a", "A"));
    commands.set("very-long-cmd", makeCmd("very-long-cmd", "Long"));
    const out: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((c: any) => { out.push(String(c)); return true; });

    const cmd: any = createHelpCommand(commands);
    invokeAction(cmd, [undefined]);
    const text = out.join("");
    const lines = text.split("\n");

    const aLine = lines.find((l: string) => l.match(/\s+a\s+/) && l.includes("A"))!;
    const longLine = lines.find((l: string) => l.includes("very-long-cmd"))!;
    expect(aLine.indexOf("A")).toBe(longLine.indexOf("Long"));

    vi.restoreAllMocks();
  });

  // ── Command-specific help ──

  it("delegates to outputHelp for known command", () => {
    const buildCmd = makeCmd("build", "Build");
    commands.set("build", buildCmd);

    const cmd: any = createHelpCommand(commands);
    invokeAction(cmd, ["build"]);

    expect(buildCmd.outputHelp).toHaveBeenCalled();
  });

  it("writes unknown command to stderr and calls exit(1)", () => {
    commands.set("build", makeCmd("build", "Build"));
    const err: string[] = [];
    vi.spyOn(process.stderr, "write").mockImplementation((c: any) => { err.push(String(c)); return true; });
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    const cmd: any = createHelpCommand(commands);
    invokeAction(cmd, ["nonexistent"]);

    expect(err.join("")).toContain("Unknown command: nonexistent");
    expect(process.exit).toHaveBeenCalledWith(1);
    vi.restoreAllMocks();
  });

  // ── Verbose mode ──

  it("shows total count with --verbose", () => {
    commands.set("a", makeCmd("a", "A"));
    commands.set("b", makeCmd("b", "B"));
    const out: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((c: any) => { out.push(String(c)); return true; });

    const cmd: any = createHelpCommand(commands);
    cmd.setOptionValue?.("verbose", true);
    invokeAction(cmd, [undefined]);

    expect(out.join("")).toContain("Total: 2 command(s)");
    vi.restoreAllMocks();
  });

  it("verbose unknown: lists available commands on stderr", () => {
    commands.set("build", makeCmd("build", "Build"));
    const err: string[] = [];
    vi.spyOn(process.stderr, "write").mockImplementation((c: any) => { err.push(String(c)); return true; });
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    const cmd: any = createHelpCommand(commands);
    cmd.setOptionValue?.("verbose", true);
    invokeAction(cmd, ["nonexistent"]);
    const text = err.join("");

    expect(text).toContain("Unknown command: nonexistent");
    expect(text).toContain("Available: build");
    vi.restoreAllMocks();
  });

  it("honors HelpOptions verbose parameter", () => {
    commands.set("x", makeCmd("x", "X"));
    const out: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((c: any) => { out.push(String(c)); return true; });

    const cmd: any = createHelpCommand(commands, { verbose: true });
    invokeAction(cmd, [undefined]);

    expect(out.join("")).toContain("Total: 1 command(s)");
    vi.restoreAllMocks();
  });
});
