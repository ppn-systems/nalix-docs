"""What an audit reports."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import Enum


class Severity(str, Enum):
    ERROR = "error"  # the docs state something the source contradicts
    WARN = "warn"  # likely stale
    GAP = "gap"  # public API the docs never mention


@dataclass(frozen=True)
class Finding:
    code: str
    severity: Severity
    page: str
    line: int
    message: str
    detail: str = ""

    @property
    def key(self) -> str:
        """Stable identity used by the accepted-findings baseline."""
        return f"{self.code}|{self.page}|{self.detail or self.message}"

    def to_dict(self) -> dict:
        data = asdict(self)
        data["severity"] = self.severity.value
        data["key"] = self.key
        return data

    def __str__(self) -> str:
        where = f"`{self.page}{':' + str(self.line) if self.line else ''}` — " if self.page else ""
        return f"[{self.code}] {where}{self.message}"
