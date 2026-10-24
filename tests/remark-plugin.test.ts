import { describe, expect, it } from 'vitest';
import { remarkNalixDocs } from '../src/plugins/remark-nalix-docs';

describe('remarkNalixDocs AST Transformations', () => {
  const plugin = remarkNalixDocs();

  it('rewrites relative markdown links and asset URLs for English (en-us) and Vietnamese (vi-vn)', () => {
    const treeEn = {
      type: 'root',
      children: [
        { type: 'link', url: './quickstart.md#run-it', children: [] },
        { type: 'image', url: 'assets/nalix.png', alt: 'Logo' },
      ],
    };

    plugin(treeEn, { path: '/workspace/src/content/docs/en-us/index.md' });
    expect(treeEn.children[0].url).toBe('/en-us/quickstart#run-it');
    expect(treeEn.children[1].url).toBe('/assets/nalix.png');

    const treeVi = {
      type: 'root',
      children: [
        { type: 'link', url: '../network/tcp-listener.md', children: [] },
      ],
    };

    plugin(treeVi, { path: '/workspace/src/content/docs/vi-vn/api/hosting/network-application.md' });
    expect(treeVi.children[0].url).toBe('/vi-vn/api/network/tcp-listener');
  });

  it('transforms mermaid code blocks into .nlx-mermaid-card HTML containers', () => {
    const tree: any = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'mermaid',
          value: 'flowchart LR\n  A --> B',
        },
      ],
    };

    plugin(tree, { path: '/workspace/src/content/docs/en-us/api/network/tcp-listener.md' });
    expect(tree.children[0].type).toBe('html');
    expect(tree.children[0].value).toContain('nlx-mermaid-card');
    expect(tree.children[0].value).toContain('flowchart LR');
  });

  it('transforms :::note[Title] container directives into Admonition Callout asides', () => {
    const tree: any = {
      type: 'root',
      children: [
        {
          type: 'containerDirective',
          name: 'warning',
          children: [
            {
              type: 'paragraph',
              data: { directiveLabel: true },
              children: [{ type: 'text', value: 'Thread Safety' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', value: 'External synchronization required.' }],
            },
          ],
        },
      ],
    };

    plugin(tree, { path: '/workspace/src/content/docs/en-us/api/index.md' });
    const node = tree.children[0];
    expect(node.data.hName).toBe('aside');
    expect(node.data.hProperties.className).toContain('nlx-callout--warning');
    expect(node.children[0].type).toBe('html');
    expect(node.children[0].value).toContain('Thread Safety');
  });
});
