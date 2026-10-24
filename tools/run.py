#!/usr/bin/env python3
"""Entry point: ``python3 tools/run.py <sync-check|sync-update|audit> [options]``."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from docsync.cli import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main())
