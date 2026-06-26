"""翻译助手交互式CLI - Rich TUI实现"""
import asyncio
from typing import Optional

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.table import Table
from rich.live import Live
from rich.text import Text
from rich.layout import Layout
from rich.markdown import Markdown

from ..config import settings
from ..core.exceptions import (
    ConfigurationException,
    AdapterException,
    ValidationException,
    TranslationAssistantException,
)
from ..core.logger import get_logger
from ..adapters.openai_adapter import OpenAIAdapter
from ..services.llm_service import LLMService
from ..services.translation_service import TranslationService

logger = get_logger(__name__)
console = Console()


def _build_direction_table(translation_service: TranslationService) -> Table:
    """构建翻译方向选择表格"""
    table = Table(title="翻译方向", show_header=True, header_style="bold cyan")
    table.add_column("编号", style="yellow", width=6)
    table.add_column("方向", style="white")
    table.add_column("说明", style="dim white")
    directions = translation_service.list_directions()
    legend = {
        "product_to_dev":   "产品经理 → 开发工程师",
        "dev_to_product":   "开发工程师 → 产品经理",
        "dev_to_ops":       "开发工程师 → 运营",
        "ops_to_dev":       "运营 → 开发工程师",
        "product_to_ops":   "产品经理 → 运营",
        "ops_to_product":   "运营 → 产品经理",
    }
    for i, (key, label) in enumerate(directions, 1):
        table.add_row(str(i), label, legend.get(key, ""))
    return table


def _get_direction_keys(translation_service) -> list[str]:
    return [k for k, _ in translation_service.list_directions()]


def _pick_direction(translation_service: TranslationService) -> str:
    """交互式选择翻译方向"""
    keys = _get_direction_keys(translation_service)
    console.print(_build_direction_table(translation_service))
    console.print()
    
    while True:
        choice = Prompt.ask(
            "请选择翻译方向 [1-6]",
            default="1",
            show_default=False,
        )
        try:
            idx = int(choice)
            if 1 <= idx <= len(keys):
                return keys[idx - 1]
        except ValueError:
            pass
        console.print("[red]无效输入，请输入 1-6 之间的数字[/red]")


async def _stream_translation(
    translation_service: TranslationService,
    text: str,
    direction: str,
    console: Console,
) -> str:
    """流式显示翻译结果，返回完整结果"""
    full_result = ""
    
    with console.status("[cyan]正在翻译...[/cyan]", spinner="dots"):
        async for chunk in translation_service.translate_stream(text, direction):
            full_result += chunk
    
    console.print()
    console.print(Panel(
        Markdown(full_result),
        title=f"[bold green]翻译结果 ({translation_service.get_direction_label(direction)})[/bold green]",
        border_style="green",
    ))
    
    return full_result


def _print_welcome() -> None:
    """打印欢迎界面"""
    welcome = Panel(
        Text.from_markup(
            "欢迎使用 [bold cyan]翻译助手[/bold cyan] (Translation Assistant)!\n\n"
            "在 6 种角色语言之间翻译沟通内容：\n"
            "产品 · 开发 · 运营\n\n"
            "输入你的内容，AI 将按选定方向进行翻译。\n"
            "输入 [bold]exit[/bold] 退出，[bold]switch[/bold] 切换方向。"
        ),
        title="🤖 Translation Agent",
        border_style="cyan",
        padding=(1, 2),
    )
    console.print(welcome)


def _print_history_entry(
    direction_label: str,
    original: str,
    result: str,
    index: int,
) -> None:
    """打印一条历史记录"""
    console.print()
    console.print(f"[bold yellow]--- 历史记录 #{index} ({direction_label}) ---[/bold yellow]")
    console.print(Panel(
        Text(original),
        title="原文",
        border_style="blue",
        title_align="left",
    ))
    console.print(Panel(
        Markdown(result),
        title="翻译结果",
        border_style="green",
        title_align="left",
    ))


async def run_agent() -> None:
    """运行翻译助手主循环"""
    # 校验配置
    try:
        settings.validate()
    except ConfigurationException as e:
        console.print(f"[red]配置错误: {e}[/red]")
        console.print("请设置 OPENAI_API_KEY 环境变量后再运行。")
        return
    
    # 初始化服务
    adapter = OpenAIAdapter()
    llm_service = LLMService(adapter)
    translation_service = TranslationService(llm_service)
    
    _print_welcome()
    
    # 首次选择方向
    console.print()
    direction = _pick_direction(translation_service)
    console.print(f"\n[green]当前方向: {translation_service.get_direction_label(direction)}[/green]")
    console.print()
    
    history: list[dict] = []
    
    while True:
        try:
            text = Prompt.ask("[bold cyan]输入内容[/bold cyan]")
        except (EOFError, KeyboardInterrupt):
            console.print("\n[yellow]再见![/yellow]")
            break
        
        if not text:
            continue
        
        cmd = text.strip().lower()
        
        if cmd in ("exit", "quit", "q"):
            console.print("[yellow]再见![/yellow]")
            break
        
        if cmd in ("switch", "s", "方向"):
            console.print()
            direction = _pick_direction(translation_service)
            console.print(f"\n[green]已切换: {translation_service.get_direction_label(direction)}[/green]")
            console.print()
            continue
        
        if cmd in ("history", "h", "历史"):
            if not history:
                console.print("[dim]暂无历史记录[/dim]")
            else:
                for i, entry in enumerate(history, 1):
                    _print_history_entry(
                        entry["direction_label"],
                        entry["original"],
                        entry["result"],
                        i,
                    )
            console.print()
            continue
        
        if cmd in ("help", "?", "帮助"):
            console.print(Panel(
                "[bold]支持的命令:[/bold]\n"
                "  [cyan]exit[/cyan] / [cyan]quit[/cyan] - 退出\n"
                "  [cyan]switch[/cyan] / [cyan]s[/cyan] - 切换翻译方向\n"
                "  [cyan]history[/cyan] / [cyan]h[/cyan] - 查看历史记录\n"
                "  [cyan]help[/cyan] / [cyan]?[/cyan] - 显示帮助\n\n"
                "[bold]其他输入:[/bold] 将作为翻译内容处理",
                title="帮助",
                border_style="cyan",
            ))
            console.print()
            continue
        
        # 执行翻译
        try:
            result = await _stream_translation(translation_service, text, direction, console)
            history.append({
                "original": text,
                "result": result,
                "direction": direction,
                "direction_label": translation_service.get_direction_label(direction),
            })
        except ValidationException as e:
            console.print(f"[yellow]输入错误: {e}[/yellow]")
        except AdapterException as e:
            console.print(f"[red]API 错误: {e}[/red]")
        except TranslationAssistantException as e:
            console.print(f"[red]翻译错误: {e}[/red]")
        except Exception as e:
            logger.exception("未预期的错误")
            console.print(f"[red]未预期的错误: {e}[/red]")
        
        console.print()


def main() -> None:
    """同步入口"""
    asyncio.run(run_agent())
