/**
 * Icons for the top-level groups of the sidebar, keyed by the group title in `NAVIGATION_TREE`.
 * Each value is the inside of a 24x24 stroke icon (stroke and size come from the CSS), and no two
 * groups share a glyph.
 */
export const NAV_ICONS: Record<string, string> = {
  // Guides
  'Getting Started': '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4.5L17 13H5"/>',
  Tutorials:
    '<path d="M2 5.5A1.5 1.5 0 0 1 3.5 4H9a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H3.5A1.5 1.5 0 0 1 2 16.5Z"/><path d="M22 5.5A1.5 1.5 0 0 0 20.5 4H15a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h6.5a1.5 1.5 0 0 0 1.5-1.5Z"/>',
  'Application Logic':
    '<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M9 6h3a3 3 0 0 1 3 3v6"/>',
  Networking:
    '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M12 7.2v4.3M12 11.5 6.4 17M12 11.5 17.6 17"/>',
  Extensibility:
    '<rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/><rect x="3" y="3" width="7" height="7" rx="1.2"/><path d="M17.5 3v7M14 6.5h7"/>',
  'Deployment & Operations':
    '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',

  // Concepts
  'Core Concepts':
    '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3Z"/>',
  'Architecture & Internals':
    '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  'Security Model': '<path d="M12 3 5 6v5.5c0 4.4 3 7.9 7 9.5 4-1.6 7-5.1 7-9.5V6Z"/><path d="m9 12 2 2 4-4"/>',
  'Advanced Topics':
    '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',

  // API Reference
  Analyzers: '<path d="m3 6 1.5 1.5L7.5 4.5M3 13l1.5 1.5 3-3M3 20l1.5 1.5 3-3M11 6h10M11 13h10M11 20h10"/>',
  Abstractions:
    '<path d="M8.3 10a.7.7 0 0 1-.6-1L11.4 3a.7.7 0 0 1 1.2 0l3.7 6a.7.7 0 0 1-.6 1Z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>',
  Framework:
    '<path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 13h18M10 13v2h4v-2"/>',
  Cryptography: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3M14 9l2 2"/>',
  Runtime: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  Network:
    '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5"/>',
  Hosting: '<path d="M7 18a4.5 4.5 0 1 1 1.2-8.8A6 6 0 0 1 19.5 11 3.5 3.5 0 0 1 18 18Z"/>',
  SDK: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
  Options: '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="16" cy="12" r="2.5"/>',
};
