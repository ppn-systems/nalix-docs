"""The real documentation, checked against the committed API index."""

import json
import re
import unittest
from pathlib import Path

from docsync.domain.api_view import ApiIndex
from docsync.domain.audit import DocsAuditor
from docsync.infrastructure.stores import DocsDirectory

ROOT = Path(__file__).resolve().parents[2]
INDEX = json.loads((ROOT / "source-api-index.json").read_text(encoding="utf-8"))
BASELINE = json.loads((ROOT / "tools/docs-audit-baseline.json").read_text(encoding="utf-8"))["accepted"]
FINDINGS = DocsAuditor().audit(ApiIndex(INDEX), DocsDirectory(ROOT / "src/content/docs/en-us").pages())


class DocsMatchTheSource(unittest.TestCase):
    def test_no_finding_beyond_the_accepted_baseline(self):
        unexpected = [str(f) for f in FINDINGS if f.key not in BASELINE]
        self.assertEqual(unexpected, [], "the docs contradict or miss the Nalix source (run `npm run audit`)")

    def test_every_accepted_finding_still_applies_and_has_a_reason(self):
        live = {f.key for f in FINDINGS}
        self.assertEqual([k for k in BASELINE if k not in live], [])
        self.assertTrue(all(isinstance(reason, str) and len(reason) > 5 for reason in BASELINE.values()))

    def test_manifest_and_index_describe_the_same_nalix_commit(self):
        manifest = json.loads((ROOT / "source-manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(INDEX["nalixCommit"], manifest["nalixCommit"])
        self.assertTrue(re.fullmatch(r"[0-9a-f]{40}", INDEX["nalixCommit"]))


if __name__ == "__main__":
    unittest.main()
