import { visit } from 'unist-util-visit';
import { DEFAULT_LOCALE, resolveLocaleCode, type LocaleCode } from '../i18n';
import { resolveMarkdownHref } from '../utils/docs';

const CALLOUT_DEFAULT_TITLES: Record<string, Record<LocaleCode, string>> = {
  note: { 'en-us': 'Note', 'vi-vn': 'Ghi chú' },
  tip: { 'en-us': 'Tip', 'vi-vn': 'Mẹo' },
  warning: { 'en-us': 'Warning', 'vi-vn': 'Cảnh báo' },
  danger: { 'en-us': 'Caution', 'vi-vn': 'Nguy hiểm' },
  important: { 'en-us': 'Important', 'vi-vn': 'Quan trọng' },
};

const CALLOUT_ICONS: Record<string, string> = {
  note: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 9v5M10 6.5h.01" stroke-linecap="round"/></svg>`,
  tip: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M10 2.5a5.5 5.5 0 0 1 3.5 9.75c-.55.45-.9 1.1-.98 1.8L12.4 15H7.6l-.12-.95c-.08-.7-.43-1.35-.98-1.8A5.5 5.5 0 0 1 10 2.5Z" stroke-linejoin="round"/><path d="M8 17.5h4" stroke-linecap="round"/></svg>`,
  warning: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M10 3.25 17.5 16.5H2.5L10 3.25Z" stroke-linejoin="round"/><path d="M10 8.5v3.75M10 14.5h.01" stroke-linecap="round"/></svg>`,
  danger: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="m7.5 7.5 5 5M12.5 7.5l-5 5" stroke-linecap="round"/></svg>`,
  important: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 6v4.5M10 13.75h.01" stroke-linecap="round"/></svg>`,
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractFileInfo(filePath: string | undefined): { locale: LocaleCode; relFile: string } {
  if (!filePath) {
    return { locale: DEFAULT_LOCALE, relFile: 'index.md' };
  }
  const normalized = filePath.replace(/\\/g, '/');
  const marker = '/src/content/docs/';
  const idx = normalized.indexOf(marker);
  if (idx === -1) {
    return { locale: DEFAULT_LOCALE, relFile: 'index.md' };
  }
  const after = normalized.slice(idx + marker.length);
  const parts = after.split('/');
  const maybeLocale = resolveLocaleCode(parts[0]);
  if (maybeLocale) {
    return {
      locale: maybeLocale,
      relFile: parts.slice(1).join('/') || 'index.md',
    };
  }
  return {
    locale: DEFAULT_LOCALE,
    relFile: after || 'index.md',
  };
}

export function remarkNalixDocs() {
  return (tree: any, file: any) => {
    const { locale, relFile } = extractFileInfo(file?.path || file?.history?.[0]);

    visit(tree, (node: any, index: number | undefined, parent: any) => {
      // 1. Resolve Markdown links and images
      if ((node.type === 'link' || node.type === 'image') && typeof node.url === 'string') {
        node.url = resolveMarkdownHref(node.url, relFile, locale);
        return;
      }

      // 2. Resolve raw HTML <img src="assets/..."> tags
      if (node.type === 'html' && typeof node.value === 'string') {
        node.value = node.value.replace(
          /(<img\b[^>]*?\bsrc=["'])([^"']+)(["'][^>]*>)/gi,
          (_match: string, prefix: string, src: string, suffix: string) => {
            const resolved = resolveMarkdownHref(src, relFile, locale);
            return `${prefix}${resolved}${suffix}`;
          }
        );
        return;
      }

      // 3. Transform ```mermaid fenced blocks into client-rendered Mermaid containers
      if (node.type === 'code' && node.lang === 'mermaid' && parent && typeof index === 'number') {
        const rawChart = escapeHtml(node.value || '');
        parent.children[index] = {
          type: 'html',
          value: `<div class="nlx-mermaid-card"><div class="nlx-mermaid-toolbar"><span class="nlx-mermaid-badge">Architecture Diagram</span></div><pre class="mermaid">${rawChart}</pre></div>`,
        };
        return;
      }

      // 4. Transform :::note[Title] ... ::: container directives into Unity-style Admonition Alerts
      if (node.type === 'containerDirective') {
        const rawKind = (node.name || 'note').toLowerCase();
        const kind = CALLOUT_DEFAULT_TITLES[rawKind] ? rawKind : 'note';
        const defaultTitle =
          CALLOUT_DEFAULT_TITLES[kind]?.[locale] ?? CALLOUT_DEFAULT_TITLES[kind]?.['en-us'] ?? 'Note';

        let customLabel = '';
        if (Array.isArray(node.children) && node.children.length > 0) {
          const firstChild = node.children[0];
          if (firstChild?.data?.directiveLabel) {
            customLabel = firstChild.children
              ?.map((c: any) => c.value || '')
              .join('')
              .trim();
            node.children.shift();
          }
        }

        const titleText = customLabel || defaultTitle;
        const iconSvg = CALLOUT_ICONS[kind] || CALLOUT_ICONS.note;

        const data = node.data || (node.data = {});
        data.hName = 'aside';
        data.hProperties = {
          className: [`nlx-callout`, `nlx-callout--${kind}`],
          role: 'note',
          'data-callout': kind,
        };

        node.children.unshift({
          type: 'html',
          value: `<div class="nlx-callout__header"><span class="nlx-callout__icon">${iconSvg}</span><span class="nlx-callout__title">${escapeHtml(titleText)}</span></div>`,
        });
      }
    });
  };
}
