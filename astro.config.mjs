import { defineConfig } from 'astro/config';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { remarkNalixDocs } from './src/plugins/remark-nalix-docs';

export default defineConfig({
  site: 'https://ppn.io.vn',
  trailingSlash: 'ignore',
  i18n: {
    defaultLocale: 'en-us',
    locales: ['en-us', 'vi-vn'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
  markdown: {
    remarkPlugins: [
      remarkGfm,
      remarkDirective,
      remarkNalixDocs,
    ],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: {
            className: ['nlx-heading-anchor'],
            ariaHidden: 'true',
            tabIndex: -1,
          },
          content: {
            type: 'text',
            value: '#',
          },
        },
      ],
    ],
    shikiConfig: {
      themes: {
        light: 'github-light-default',
        dark: 'github-dark-default',
      },
      langAlias: {
        caddyfile: 'nginx',
      },
      wrap: false,
    },
  },
});
