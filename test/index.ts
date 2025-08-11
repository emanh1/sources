import { flags } from '../src/entrypoint/targets';
import type { SourceControls } from '../src/entrypoint/sources';
import type { Manga, Chapter, Page } from '../src/utils/types';
import { sources } from './source';
// ---------------------
// Helper functions
// ---------------------
async function loadImageThroughProxy(proxyUrl: string, imageUrl: string, referer?: string) {
  const response = await fetch(`${proxyUrl}?destination=${encodeURIComponent(imageUrl)}`, {
    headers: referer ? { 'X-Referer': referer } : {},
  });
  if (!response.ok) throw new Error(`Failed to fetch image ${imageUrl}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

function render(html: string) {
  const app = document.getElementById('app');
  if (app) app.innerHTML = html;
}

function renderSourcesSelector(sources: ReturnType<SourceControls['listSources']>, defaultTitle = 'One Piece') {
  return `
    <div style="margin-bottom:1em;">
      <label>Manga Title: <input id="titleInput" value="${defaultTitle}" /></label>
      <button id="loadBtn">Search Mangas</button>
    </div>
    <div style="margin-bottom:1em;">
      <label>Source:
        <select id="sourceSelect">
          ${sources.map(s => {
    const flagList = (s.flags || [])
      .map(f => f.replace(/^flags\./, '').toLowerCase())
      .join(', ');
    return `<option value="${s.id}">${s.id}${flagList ? ` (${flagList})` : ''}</option>`;
  }).join('')}
        </select>
      </label>
    </div>
    <div style="margin-bottom:1em;">
      <label>
        <input type="checkbox" id="proxyToggle" />
        Use Proxy for images
      </label>
    </div>
    <div id="output"></div>
    <div id="pages"></div>
  `;
}


function renderMangas(mangas: Manga[]) {
  console.log(mangas);
  return `<ul>
        ${mangas.map((m, i) =>
    `<li><a href="#" data-manga-idx="${i}">${m.title}</a></li>`
  ).join('')}
    </ul>`;
}

function renderChapters(chapters: Chapter[]) {
  return `<ul>
        ${chapters.map((ch, i) =>
    `<li><a href="#" data-chapter-idx="${i}">Ch. ${ch.chapterNumber || i + 1}</a></li>`
  ).join('')}
    </ul>`;
}

async function renderPages(pages: Page[], useProxy: boolean, proxyUrl: string, referer?: string) {
  const container = document.getElementById('pages');
  if (!container) return;
  container.innerHTML = 'Loading images...';

  try {
    const imageSources = await Promise.all(
      pages.map(p =>
        useProxy ? loadImageThroughProxy(proxyUrl, p.url, referer) : Promise.resolve(p.url)
      )
    );
    container.innerHTML = imageSources.map(
      src => `<img src="${src}" style="max-width: 100%; margin-bottom: 1em;" />`
    ).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = 'Failed to load images.';
  }
}

// ---------------------
// Main UI Logic
// ---------------------
function setupUI(sourceControls: SourceControls, proxyUrl = 'http://localhost:3000') {
  const sources = sourceControls.listSources();
  render(renderSourcesSelector(sources));

  const loadBtn = document.getElementById('loadBtn');
  loadBtn?.addEventListener('click', async () => {
    const title = (document.getElementById('titleInput') as HTMLInputElement).value.trim();
    const sourceId = (document.getElementById('sourceSelect') as HTMLSelectElement).value;
    const useProxyToggle = (document.getElementById('proxyToggle') as HTMLInputElement).checked;  // <-- read toggle here

    const outputDiv = document.getElementById('output');
    const pagesDiv = document.getElementById('pages');

    if (!outputDiv || !pagesDiv) return;

    outputDiv.innerHTML = 'Searching mangas...';
    pagesDiv.innerHTML = '';

    try {
      const mangas = await sourceControls.runSourceForMangas({ sourceId, titleInput: title });
      if (!mangas.length) {
        outputDiv.innerHTML = 'No mangas found.';
        return;
      }

      outputDiv.innerHTML = renderMangas(mangas);

      const source = sources.find(s => s.id === sourceId);
      // Keep this to check if source flags need proxy or referer (if you want to use them still)
      const needsReferer = source?.flags?.includes(flags.NEEDS_REFERER_HEADER) ?? false;
      const referer = needsReferer ? source?.url : undefined;

      outputDiv.querySelectorAll<HTMLAnchorElement>('a[data-manga-idx]')?.forEach(mangaLink => {
        mangaLink.addEventListener('click', async e => {
          e.preventDefault();
          const mIdx = +mangaLink.getAttribute('data-manga-idx')!;
          const manga = mangas[mIdx];

          outputDiv.innerHTML = 'Loading chapters...';
          try {
            const chapters = await sourceControls.runSourceForChapters({ manga });
            if (!chapters.length) {
              outputDiv.innerHTML = 'No chapters found.';
              return;
            }
            outputDiv.innerHTML = renderChapters(chapters);

            outputDiv.querySelectorAll<HTMLAnchorElement>('a[data-chapter-idx]')?.forEach(chLink => {
              chLink.addEventListener('click', async e => {
                e.preventDefault();
                const cIdx = +chLink.getAttribute('data-chapter-idx')!;
                pagesDiv.innerHTML = 'Loading pages...';

                try {
                  const pages = await sourceControls.runSourceForPages({ chapter: chapters[cIdx] });
                  if (!pages.length) {
                    pagesDiv.innerHTML = 'No pages found.';
                    return;
                  }
                  // Use the toggle here:
                  await renderPages(pages, useProxyToggle, proxyUrl, referer);
                } catch (err) {
                  console.error(err);
                  pagesDiv.innerHTML = 'Failed to load pages.';
                }
              });
            });
          } catch (err) {
            console.error(err);
            outputDiv.innerHTML = 'Failed to load chapters.';
          }
        });
      });
    } catch (err) {
      console.error(err);
      outputDiv.innerHTML = 'Failed to search mangas.';
    }
  });

}

// ---------------------
// Boot
// ---------------------
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const sourceControls = sources
    setupUI(sourceControls);
  });
}

