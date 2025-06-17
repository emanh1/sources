import { gatherAllSources, runSourceForChapters } from "../src/index";

// Proxy configuration
const proxyBase = 'https://simple-proxy-pnor.onrender.com/?destination=';

const context = {
  title: "One Piece",
  proxiedFetcher: async (url: string) => {
    const proxiedUrl = proxyBase + encodeURIComponent(url);
    const response = await fetch(proxiedUrl);
    const data = await response.text();
    console.log("[proxiedFetcher] fetched URL:", url);
    return { data };
  }
};

async function fetchPagesForChapter(sourceId: string, chapter: any) {
  const sources = gatherAllSources();
  const source = sources.find(src => src.id === sourceId);
  if (!source) {
    throw new Error(`Source ${sourceId} not found.`);
  }
  
  const ctx = { ...context, ...chapter };
  console.log(`[fetchPagesForChapter] Fetching pages for chapter ${chapter.chapterNumber} from source ${sourceId}`);

  const pages = await source.scrapePagesofChapter(ctx);
  console.log(`[fetchPagesForChapter] Retrieved ${pages.length} pages`);

  return pages;
}

function renderSourceSelector(sources: { id: string }[]): string {
  return `
    <label for="sourceSelect"><strong>Select Source:</strong></label>
    <select id="sourceSelect">
      ${sources.map(s => `<option value="${s.id}">${s.id}</option>`).join('')}
    </select>
    <button id="loadSourceBtn">Load Chapters</button>
  `;
}

async function main() {
  const sources = gatherAllSources();

  const app = document.querySelector("#app");

  if (!app) {
    console.error("Missing #app element in DOM.");
    return;
  }
  
  // Display a picker first
  app.innerHTML = renderSourceSelector(sources);
  
  const loadBtn = document.querySelector<HTMLButtonElement>("#loadSourceBtn");

  if (!loadBtn) {
    console.error("Missing #loadSourceBtn.");
    return;
  }
  
  loadBtn.addEventListener("click", async () => {
    const select = document.querySelector<HTMLSelectElement>("#sourceSelect");

    if (!select) {
      console.error("Missing #sourceSelect.");
      return;
    }
    const sourceId = select.value;

    await loadChaptersForSource(sourceId);
  });

  async function loadChaptersForSource(sourceId: string) {
    const pagesContainer = document.querySelector("#pages");

    if (!pagesContainer) {
      console.error("Missing #pages.");
      return;
    }
    if (!sourceId) {
      console.error("SourceId is undefined.");
      return;
    }
  
    let chapters;
    try {
      chapters = await runSourceForChapters(context, sourceId);
    } catch (err: any) {
      console.error(err);
      app.innerHTML = `<p style="color: red;">Error loading chapters: ${err?.message || ''}</p>`;
      return;
    }
  
    if (chapters.length === 0) {
      app.innerHTML = "<p>No chapters found for this source</p>";
      return;
    }
  
    // Display chapters
    app.innerHTML = `
      <h1>Chapters from Source: ${sourceId}</h1>
      <p>Total chapters: ${chapters.length}</p>
      <ul>
        ${chapters.map(ch => `
          <li>
            ${sourceId} — Ch.${ch.chapterNumber} — 
            <a href="#" data-source="${sourceId}" data-chapter='${JSON.stringify(ch)}'>Read</a>
          </li>
        `).join('')}
      </ul>
    `;
  
    // Bind events to chapter links
    const chapterLinks = app.querySelectorAll<HTMLAnchorElement>('a[data-source]');

    chapterLinks?.forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();

        const srcId = link.dataset.source;
        const chapter = link.dataset.chapter ? JSON.parse(link.dataset.chapter) : undefined;

        if (!srcId || !chapter) {
          console.error("SourceId or chapter is undefined.");
          return;
        }
  
        pagesContainer.innerHTML = `<p>Loading pages for Chapter ${chapter.chapterNumber}...</p>`;
  
        try {
          const pages = await fetchPagesForChapter(srcId, chapter);
  
          pagesContainer.innerHTML = pages.map((page) => 
            `<img src="${page.url}" alt="Page ${page.id + 1}" style="max-width: 100%; margin-bottom: 1em;">`
          ).join('');
        } catch (err: any) {
          pagesContainer.innerHTML = `<p style="color: red;">Failed to load pages: ${err?.message || ''}</p>`;
        }
      });
    });
  }
}

main().catch(err => console.error(err));


