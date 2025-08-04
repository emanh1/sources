import { sources, availableSources } from "../test/source";
import { flags } from "../src/entrypoint/targets";

async function loadImageThroughProxy(imageUrl: string, referer?: string) {
  const response = await fetch(`http://localhost:3000?destination=${encodeURIComponent(imageUrl)}`, {
    headers: referer ? { 'X-Referer': referer } : {},
  });

  if (!response.ok) throw new Error(`Failed to fetch image ${imageUrl}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

function render(html: string) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = html;
  }
}

function renderSourcesSelector(sources: any[], defaultTitle = "One Piece") {
  return `
    <div style="margin-bottom:1em;">
      <label>Manga Title: <input id="titleInput" value="${defaultTitle}" /></label>
      <button id="loadBtn">Load Chapters</button>
    </div>
    <div style="margin-bottom:1em;">
      <label>Source:
        <select id="sourceSelect">
          ${sources.map(s => {
            const flagList = (s.flags || []).map(f => f.replace(/^flags\./, '').toLowerCase()).join(', ');
            return `<option value="${s.id}">${s.id}${flagList ? ` (${flagList})` : ''}</option>`;
          }).join('')}

        </select>
      </label>
    </div>
    <div id="output"></div>
    <div id="pages"></div>
  `;
}

function renderChapters(chapters: any[]) {
  return `<ul>
    ${chapters.map((ch, i) => `<li><a href="#" data-idx="${i}">Ch. ${ch.chapterNumber || i + 1}</a></li>`).join('')}
  </ul>`;
}

async function renderPages(pages: any[], useProxy: boolean, referer?: string) {
  const container = document.getElementById('pages');
  if (!container) return;

  container.innerHTML = 'Loading images...';

  try {
    const imageSources = await Promise.all(
      pages.map(p =>
        useProxy ? loadImageThroughProxy(p.url, referer) : Promise.resolve(p.url)
      )
    );

    container.innerHTML = imageSources.map(
      (src) => `<img src="${src}" style="max-width: 100%; margin-bottom: 1em;" />`
    ).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = 'Failed to load images.';
  }
}

function setupUI() {
  render(renderSourcesSelector(availableSources));

  const loadBtn = document.getElementById('loadBtn');
  loadBtn?.addEventListener('click', async () => {
    const title = (document.getElementById('titleInput') as HTMLInputElement).value.trim();
    const sourceId = (document.getElementById('sourceSelect') as HTMLSelectElement).value;
    const outputDiv = document.getElementById('output');
    const pagesDiv = document.getElementById('pages');

    outputDiv!.innerHTML = 'Loading chapters...';
    pagesDiv!.innerHTML = '';

    try {
      const chapters = await sources.runSourceForChapters({
        manga: { id: 'lablabh', title },
        id: sourceId,
      });

      if (!chapters || chapters.length === 0) {
        outputDiv!.innerHTML = 'No chapters found.';
        return;
      }

      outputDiv!.innerHTML = renderChapters(chapters);

      const source = availableSources.find(s => s.id === sourceId);
      const useProxy = source?.flags?.includes(flags.DYNAMIC_RENDER) ?? false;
      const needsReferer = source?.flags?.includes(flags.NEEDS_REFERER_HEADER) ?? false;
      const referer = source.url;
      console.log('useproxy', useProxy);
      console.log('referer', needsReferer, referer);
      outputDiv!.querySelectorAll('a[data-idx]')?.forEach(link => {
        link.addEventListener('click', async (e) => {
          e.preventDefault();
          const idx = +(link as HTMLElement).getAttribute('data-idx')!;
          pagesDiv!.innerHTML = 'Loading pages...';

          try {
            const pages = await sources.runSourceForPages({ chapter: chapters[idx] });
            if (!pages || pages.length === 0) {
              pagesDiv!.innerHTML = 'No pages found.';
              return;
            }
            await renderPages(pages, useProxy, referer);
          } catch (err) {
            console.error(err);
            pagesDiv!.innerHTML = 'Failed to load pages.';
          }
        });
      });
    } catch (err) {
      console.error(err);
      outputDiv!.innerHTML = 'Failed to load chapters.';
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', setupUI);
}

