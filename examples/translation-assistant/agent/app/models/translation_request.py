"""翻译请求数据模型"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class TranslationRequest:
    """翻译请求数据模型"""
    text: str
    direction: str  # product_to_dev, dev_to_product, etc.
    stream: bool = True
    
    def validate(self) -> None:
        """验证请求数据"""
        from ..core.exceptions import ValidationException
        
        if not self.text or not self.text.strip():
            raise ValidationException(
                "Translation text cannot be empty",
                error_code="EMPTY_TEXT"
            )
        
        from ..services.translation_service import DIRECTION_LABELS
        if self.direction not in DIRECTION_LABELS:
            raise ValidationException(
                f"Invalid direction: '{self.direction}'. "
                f"Valid options: {', '.join(DIRECTION_LABELS.keys())}",
                error_code="INVALID_DIRECTION"
            )
