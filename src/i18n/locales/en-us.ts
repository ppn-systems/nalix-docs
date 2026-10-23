export const enUs = {
  'site.title': 'Nalix Documentation',
  'site.headerBrand': 'Documentation',
  'site.tagline': 'Enterprise-grade real-time TCP, UDP, and WebSocket networking framework for .NET 10.',
  'site.announcement': 'Nalix for .NET 10 — Ultra-low latency, zero-allocation packet engine.',

  // Header & Navigation
  'nav.overview': 'Home',
  'nav.startHere': 'Get Started',
  'nav.guides': 'Guides',
  'nav.concepts': 'Concepts',
  'nav.packages': 'Packages',
  'nav.api': 'API Reference',
  'nav.benchmarks': 'Benchmarks',
  'nav.searchPlaceholder': 'Search documentation...',
  'nav.searchButton': 'Search',
  'nav.searchShortcut': 'Ctrl K',
  'nav.filterSidebar': 'Filter by title',
  'nav.github': 'GitHub',
  'nav.nuget': 'NuGet Packages',
  'nav.language': 'Select a language',
  'nav.comingSoon': 'Soon',
  'nav.themeToggle': 'Toggle the theme',

  // Home Portal (Unity Docs Style)
  'hero.title': 'Nalix Documentation',
  'hero.subtitle':
    'Explore manuals, API references, and architectural guides for the Nalix .NET 10 real-time networking ecosystem.',
  'home.exploreTopics': 'Explore topics',

  // Reader Layout & TOC
  'doc.onThisPage': 'On this page',
  'doc.readTime': 'Read time',
  'doc.minute': 'minute',
  'doc.minutes': 'minutes',
  'doc.editPage': 'Edit this page on GitHub',
  'doc.backToTop': 'Back to top',
  'doc.previous': 'Previous',
  'doc.next': 'Next',
  'doc.copyCode': 'Copy',
  'doc.copiedCode': 'Copied',
  'doc.fallbackBannerTitle': 'Translation Pending',
  'doc.fallbackBannerBody':
    'This page has not been translated into your selected language yet. Showing the canonical English (en-US) documentation.',
  'doc.packageLabel': 'Package',
  'doc.namespaceLabel': 'Namespace',

  // Search Modal
  'search.inputPlaceholder': 'Search guides, APIs, packets, and benchmarks...',
  'search.noResults': 'No matching documentation found.',
  'search.InitialHint': 'Type to search across all 203 Nalix documentation pages.',
  'search.navigateHint': 'to navigate',
  'search.selectHint': 'to select',
  'search.closeHint': 'to close',

  // Footer
  'footer.copyright': 'Copyright © 2025–2026 PPN Corporation. All rights reserved.',
  'footer.license': 'Apache-2.0 License',
  'footer.builtWith': 'Engineered for .NET 10.',
} as const;

export type TranslationKey = keyof typeof enUs;
export type TranslationDictionary = Record<TranslationKey, string>;
