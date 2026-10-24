export interface SearchItem {
  title: string;
  description: string;
  section: string;
  pkg?: string;
  url: string;
  locale: string;
  headings: string[];
}

let cachedIndex: SearchItem[] | null = null;

export async function loadSearchIndex(): Promise<SearchItem[]> {
  if (cachedIndex) return cachedIndex;
  try {
    const res = await fetch('/search-index.json');
    cachedIndex = await res.json();
    return cachedIndex || [];
  } catch {
    return [];
  }
}

/** Ranks the pages of one locale against the query; an empty query returns the first `limit` pages. */
export async function searchPages(query: string, locale: string, limit: number): Promise<SearchItem[]> {
  const q = query.trim().toLowerCase();
  const all = (await loadSearchIndex()).filter((i) => i.locale === locale);
  if (!q) return all.slice(0, Math.min(limit, 8));

  const terms = q.split(/\s+/).filter(Boolean);
  return all
    .map((item) => {
      let score = 0;
      const tLower = item.title.toLowerCase();
      const dLower = item.description.toLowerCase();
      const hLower = item.headings.join(' ').toLowerCase();
      const pLower = (item.pkg || '').toLowerCase();

      for (const term of terms) {
        if (tLower === term) score += 100;
        else if (tLower.startsWith(term)) score += 60;
        else if (tLower.includes(term)) score += 40;

        if (pLower.includes(term)) score += 25;
        if (hLower.includes(term)) score += 20;
        if (dLower.includes(term)) score += 10;
      }
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}
