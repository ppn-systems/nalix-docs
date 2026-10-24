"""Reads a GitHub source tarball."""

from __future__ import annotations

import io
import tarfile
from collections.abc import Callable

from ..application.ports import SyncError


def read_tarball(data: bytes, wanted: Callable[[str], bool]) -> tuple[dict[str, str], list[str]]:
    """Returns ``(texts of the files for which wanted(path) is true, every file path)``.

    GitHub wraps the repository in a ``<repo>-<sha>/`` folder, which is stripped.
    """
    texts: dict[str, str] = {}
    paths: list[str] = []
    try:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
            for member in archive:
                if not member.isfile():
                    continue
                path = member.name.split("/", 1)[1] if "/" in member.name else member.name
                paths.append(path)
                if wanted(path):
                    texts[path] = archive.extractfile(member).read().decode("utf-8", "replace")  # type: ignore[union-attr]
    except (tarfile.TarError, OSError, EOFError) as error:
        raise SyncError(f"tarball is corrupt ({error})") from error
    return texts, sorted(paths)
