from pathlib import Path
from textwrap import dedent
import base64
import sys

sys.stdout.reconfigure(encoding='utf-8')
root = Path('nalix-docs')
tree = dedent('''
nalix-docs/
+-- mkdocs.yml
+-- docs/
    +-- api/
    |   +-- overview.md
    +-- assets/
    |   +-- favicon.ico
    |   +-- logo.png
    +-- concepts/
    |   +-- architecture.md
    |   +-- middleware.md
    |   +-- real-time.md
    +-- guides/
    |   +-- basic-server.md
    |   +-- client-connection.md
    +-- packages/
    |   +-- nalix-common.md
    |   +-- nalix-framework.md
    |   +-- nalix-logging.md
    |   +-- nalix-network.md
    |   +-- nalix-sdk.md
    +-- getting-started.md
    +-- index.md
    +-- installation.md
    +-- quickstart.md
''')
print(tree)
files = [
    'mkdocs.yml',
    'docs/index.md',
    'docs/getting-started.md',
    'docs/installation.md',
    'docs/quickstart.md',
    'docs/concepts/architecture.md',
    'docs/concepts/real-time.md',
    'docs/concepts/middleware.md',
    'docs/packages/nalix-sdk.md',
    'docs/packages/nalix-network.md',
    'docs/packages/nalix-common.md',
    'docs/packages/nalix-logging.md',
    'docs/packages/nalix-framework.md',
    'docs/api/overview.md',
    'docs/guides/basic-server.md',
    'docs/guides/client-connection.md',
    'docs/assets/logo.png',
    'docs/assets/favicon.ico',
]
for rel in files:
    path = root / rel
    data = path.read_bytes()
    if path.suffix in {'.png', '.ico'}:
        encoded = base64.b64encode(data).decode('ascii')
        lines = [encoded[i:i+76] for i in range(0, len(encoded), 76)]
        content = '\n'.join(lines)
    else:
        content = data.decode('utf-8').rstrip('\n')
    print(f'=== FILE: {path.as_posix()} ===')
    print(content)
    print()
