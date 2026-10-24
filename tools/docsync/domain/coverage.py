"""Documentation coverage per package: how many public types and methods the pages mention."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass

from .api_view import ApiIndex
from .markdown import Page

_INTERNAL_NAMESPACE = re.compile(r"(^|\.)Internal(\.|$)")
_ROOTS = ("src/", "analyzers/")


@dataclass(frozen=True)
class PackageCoverage:
    package: str
    types: int
    types_documented: int
    members: int
    members_documented: int
    missing_types: tuple[str, ...]

    @staticmethod
    def _pct(done: int, total: int) -> float:
        return round(100 * done / total, 1) if total else 100.0

    @property
    def types_pct(self) -> float:
        return self._pct(self.types_documented, self.types)

    @property
    def members_pct(self) -> float:
        return self._pct(self.members_documented, self.members)

    def to_dict(self) -> dict:
        data = asdict(self)
        data["missing_types"] = list(self.missing_types)
        data["types_pct"], data["members_pct"] = self.types_pct, self.members_pct
        return data


def _package_of(path: str) -> str | None:
    for root in _ROOTS:
        if path.startswith(root):
            return path[len(root):].split("/", 1)[0]
    return None


def compute_coverage(index: ApiIndex, pages: tuple[Page, ...]) -> list[PackageCoverage]:
    """A type or method counts as documented when its name appears as a whole word on any page."""
    words = set(re.findall(r"\w+", "\n".join(page.full_text for page in pages), re.ASCII))
    types: dict[str, dict[str, bool]] = {}
    for t in index.types:
        package = _package_of(t["file"])
        if package is None or _INTERNAL_NAMESPACE.search(t["namespace"]):
            continue
        if t["file"].startswith("analyzers/") and t["name"].endswith("Model"):
            continue  # source-generator pipeline models, as in A010
        types.setdefault(package, {})[t["name"]] = t["name"] in words

    members: dict[str, list[bool]] = {}
    for name, overloads in index.signatures.items():
        for o in overloads:
            package = _package_of(o["file"])
            owner = o["type"].rsplit(".", 1)[-1]
            if package is None or owner not in types.get(package, {}):
                continue  # internal or generated owner
            members.setdefault(package, []).append(types[package][owner] and name in words)

    return [
        PackageCoverage(
            package=package,
            types=len(found),
            types_documented=sum(found.values()),
            members=len(members.get(package, [])),
            members_documented=sum(members.get(package, [])),
            missing_types=tuple(sorted(n for n, ok in found.items() if not ok)),
        )
        for package, found in sorted(types.items())
    ]


def render_coverage(rows: list[PackageCoverage], missing_limit: int = 8) -> str:
    lines = ["## Documentation coverage", "", "| Package | Types | Methods |", "| :--- | ---: | ---: |"]
    for r in rows:
        lines.append(f"| `{r.package}` | {r.types_documented}/{r.types} ({r.types_pct}%) | {r.members_documented}/{r.members} ({r.members_pct}%) |")
    total = lambda f: sum(f(r) for r in rows)  # noqa: E731
    lines.append(
        f"| **All** | **{total(lambda r: r.types_documented)}/{total(lambda r: r.types)}** | "
        f"**{total(lambda r: r.members_documented)}/{total(lambda r: r.members)}** |"
    )
    gaps = [r for r in rows if r.missing_types]
    if gaps:
        lines += ["", "Types not mentioned in any page:", ""]
        for r in gaps:
            shown = ", ".join(f"`{n}`" for n in r.missing_types[:missing_limit])
            more = f", +{len(r.missing_types) - missing_limit} more" if len(r.missing_types) > missing_limit else ""
            lines.append(f"- `{r.package}`: {shown}{more}")
    return "\n".join(lines) + "\n"
