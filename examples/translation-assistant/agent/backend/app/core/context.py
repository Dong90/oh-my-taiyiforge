import uuid
from contextvars import ContextVar

request_id_var: ContextVar[str] = ContextVar("request_id", default=str(uuid.uuid4()))


def get_request_id() -> str:
    return request_id_var.get()


def set_request_id(rid: str) -> None:
    request_id_var.set(rid)
