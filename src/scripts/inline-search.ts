import { searchPages } from './search';

interface InlineSearchOptions {
  input: HTMLInputElement;
  list: HTMLElement;
  locale: string;
  emptyText: string;
  limit?: number;
}

/**
 * Turns a text input into a search box: results drop down under it as you type
 * (↑ ↓ to move, Enter to open, Esc to close). Returns `run` to search for the current text.
 */
export function attachInlineSearch({ input, list, locale, emptyText, limit = 8 }: InlineSearchOptions) {
  let selected = 0;
  let request = 0;

  const links = () => Array.from(list.querySelectorAll<HTMLAnchorElement>('.nlx-search-item'));
  const setOpen = (open: boolean) => {
    list.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
  };
  const select = (index: number) => {
    const items = links();
    if (!items.length) return;
    items[selected]?.classList.remove('is-selected');
    selected = (index + items.length) % items.length;
    items[selected].classList.add('is-selected');
    items[selected].scrollIntoView({ block: 'nearest' });
  };

  async function run() {
    const id = ++request;
    if (!input.value.trim()) return setOpen(false);
    const results = await searchPages(input.value, locale, limit);
    if (id !== request) return; // a newer keystroke superseded this search
    list.replaceChildren();
    selected = 0;
    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'nlx-search-pop__empty';
      empty.textContent = emptyText;
      list.append(empty);
    }
    results.forEach((item, i) => {
      const a = document.createElement('a');
      a.href = item.url;
      a.className = 'nlx-search-item' + (i === 0 ? ' is-selected' : '');
      a.setAttribute('role', 'option');
      const top = document.createElement('div');
      top.className = 'nlx-search-item__top';
      const title = document.createElement('span');
      title.className = 'nlx-search-item__title';
      title.textContent = item.title;
      const section = document.createElement('span');
      section.className = 'nlx-search-item__section';
      section.textContent = item.pkg || item.section;
      top.append(title, section);
      const desc = document.createElement('div');
      desc.className = 'nlx-search-item__desc';
      desc.textContent = item.description;
      a.append(top, desc);
      list.append(a);
    });
    setOpen(true);
  }

  input.addEventListener('input', run);
  input.addEventListener('focus', () => input.value.trim() && run());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      select(selected + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      select(selected - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = links()[selected];
      if (target) window.location.href = target.href;
      else run();
    } else if (e.key === 'Escape') {
      if (list.hidden) input.blur();
      else setOpen(false);
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!list.parentElement?.contains(e.target as Node)) setOpen(false);
  });

  return { run };
}
