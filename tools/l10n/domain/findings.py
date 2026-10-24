"""What a translation check reports."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import Enum


class Severity(str, Enum):
    ERROR = "error"  # the translation breaks the page (structure, code, links) or is out of date
    WARN = "warn"  # worth a look, does not fail the check


@dataclass(frozen=True)
class Issue:
    code: str
    severity: Severity
    page: str
    line: int  # line in the translated page (0 when the page as a whole is meant)
    message: str

    def __str__(self) -> str:
        where = f"{self.page}:{self.line}" if self.line else self.page
        return f"{self.code} {where} — {self.message}"

    def to_dict(self) -> dict:
        return asdict(self)
