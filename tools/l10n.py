#!/usr/bin/env python3
"""Entry point: ``python3 tools/l10n.py <status|check|plan|stamp|fix-anchors> --locale <code>``."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from l10n.cli import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main())
