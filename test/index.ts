import { sources, availableSources } from "../test/source";

function render(html: string) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = html;
  } else {
    console.warn('No #app container found');
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
          ${sources.map(s => `<option value="${s.id}">${s.id}</option>`).join('')}
        </select>
      </label>
    </div>
    <div id="output"></div>
    <div id="pages"></div>
  `;
}

function renderChapters(chapters: any[]) {
  return `<ul>
    ${chapters.map((ch, i) => `<li><a href="#" data-idx="${i}">Ch. ${ch.chapterNumber || i+1}</a></li>`).join('')}
  </ul>`;
}

function renderPages(pages: any[]) {
  return pages.map((p: any) => `<img src="${p.url}" style="max-width:100%;margin-bottom:1em;" />`).join('');
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
        manga: { malId: 1, title },
        id: sourceId,
      });
      if (!chapters || chapters.length === 0) {
        outputDiv!.innerHTML = 'No chapters found.';
        return;
      }
      outputDiv!.innerHTML = renderChapters(chapters);
      outputDiv!.querySelectorAll('a[data-idx]').forEach(link => {
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
            pagesDiv!.innerHTML = renderPages(pages);
          } catch (err) {
            console.log(err);
            pagesDiv!.innerHTML = 'Failed to load pages.';
          }
        });
      });
    } catch (err) {
      outputDiv!.innerHTML = 'Failed to load chapters.';
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', setupUI);
}