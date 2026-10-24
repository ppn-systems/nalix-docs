"""Minimal GitHub REST client with retries."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from collections.abc import Callable
from typing import Any

from ..application.ports import SyncError

_API = "https://api.github.com"
_TIMEOUT_SECONDS = 120


class GitHubApi:
    def __init__(self, token: str | None = None, attempts: int = 4, sleep: Callable[[float], None] = time.sleep) -> None:
        self._token = token or os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
        self._attempts = attempts
        self._sleep = sleep

    def get_json(self, path: str) -> Any:
        return json.loads(self.get_bytes(path))

    def get_bytes(self, path: str) -> bytes:
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "nalix-docs-docsync"}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        for attempt in range(1, self._attempts + 1):
            try:
                with urllib.request.urlopen(urllib.request.Request(_API + path, headers=headers), timeout=_TIMEOUT_SECONDS) as response:
                    return response.read()
            except urllib.error.HTTPError as error:
                self._handle_http_error(path, error, attempt)
            except (urllib.error.URLError, TimeoutError, ConnectionError) as error:
                if attempt >= self._attempts:
                    raise SyncError(f"GitHub {path} -> network error: {getattr(error, 'reason', error)}") from error
                self._sleep(2**attempt)
        raise SyncError(f"GitHub {path} -> gave up after {self._attempts} attempts")  # pragma: no cover

    def _handle_http_error(self, path: str, error: urllib.error.HTTPError, attempt: int) -> None:
        body = error.read().decode("utf-8", "replace")[:300]
        if error.code == 404:
            raise SyncError(f"GitHub {path} -> 404: repository or ref not found (a private repository needs GITHUB_TOKEN).") from error
        if error.code in (403, 429) and error.headers.get("x-ratelimit-remaining") == "0":
            reset = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(int(error.headers.get("x-ratelimit-reset", "0"))))
            raise SyncError(f"GitHub API rate limit exhausted until {reset}; set GITHUB_TOKEN.") from error
        retry_after = error.headers.get("retry-after")
        retryable = error.code >= 500 or error.code == 429 or retry_after is not None
        if not retryable or attempt >= self._attempts:
            raise SyncError(f"GitHub {path} -> HTTP {error.code} {body}") from error
        self._sleep(float(retry_after) if retry_after else 2**attempt)
