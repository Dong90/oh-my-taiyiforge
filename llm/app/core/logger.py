"""结构化日志模块"""
import logging
import json
from datetime import datetime


class StructuredLogger(logging.Logger):
    """结构化日志记录器，输出 JSON 格式"""

    def _log_json(self, level: str, message: str, **kwargs):
        safe_kwargs = {}
        for k, v in kwargs.items():
            try:
                json.dumps({k: v}, ensure_ascii=False)
                safe_kwargs[k] = v
            except (TypeError, ValueError):
                safe_kwargs[k] = str(v)
        record = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "message": message,
            **safe_kwargs,
        }
        super()._log(getattr(logging, level), json.dumps(record, ensure_ascii=False), ())

    def info(self, msg, *args, **kwargs):
        self._log_json("INFO", msg, **kwargs)

    def warning(self, msg, *args, **kwargs):
        self._log_json("WARNING", msg, **kwargs)

    def error(self, msg, *args, **kwargs):
        self._log_json("ERROR", msg, **kwargs)

    def debug(self, msg, *args, **kwargs):
        self._log_json("DEBUG", msg, **kwargs)


logging.setLoggerClass(StructuredLogger)


def get_logger(name: str) -> StructuredLogger:
    return logging.getLogger(name)
