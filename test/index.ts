import { makeFetcher, gatherAllSources, makeSimpleProxyFetcher, makeStandardFetcher, runSourceForChapters } from "../src/index";

// Proxy configuration
const proxyBase = 'https://simple-proxy-pnor.onrender.com';

// const context = {
//   title: "One Piece",
//   proxiedFetcher: async (url: string) => {
//     const proxiedUrl = proxyBase + encodeURIComponent(url);
//     const response = await fetch(proxiedUrl);
//     const data = await response.text();
//     console.log("[proxiedFetcher] fetched URL:", url);
//     return { data };
//   },
//   fetcher: async (url: string) => {
//     const response = await fetch(url);
//     const data = await response.text();
//     console.log("[fetcher] fetched URL (direct):", url);
//     return { data };
//   }
// };

const context = {
  title: "One Piece",
  proxiedFetcher: makeFetcher(makeSimpleProxyFetcher(proxyBase, fetch)),
  fetcher: makeFetcher(makeStandardFetcher(fetch))
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
function renderTitleInputAndSourceSelector(sources: { id: string }[], defaultTitle = ''): string {
  return `
    <label for="titleInput"><strong>Enter Manga Title:</strong></label>
    <input type="text" id="titleInput" value="${defaultTitle}" placeholder="One Piece" />
    <button id="loadTitleBtn">Load Sources</button>

    <div id="sourceSelectorContainer" style="margin-top: 1em; display: none;">
      <label for="sourceSelect"><strong>Select Source:</strong></label>
      <select id="sourceSelect">
        ${sources.map(s => `<option value="${s.id}">${s.id}</option>`).join('')}
      </select>
      <button id="loadSourceBtn">Load Chapters</button>
    </div>
  `;
}

async function main() {
  const sources = gatherAllSources();
  const app = document.querySelector("#app");
  const pagesContainer = document.querySelector("#pages");

  if (!app || !pagesContainer) {
    console.error("Missing #app or #pages element in DOM.");
    return;
  }

  // Initially render title input + source selector (hidden)
  app.innerHTML = renderTitleInputAndSourceSelector(sources);

  const loadTitleBtn = document.querySelector<HTMLButtonElement>("#loadTitleBtn");
  const sourceSelectorContainer = document.querySelector<HTMLDivElement>("#sourceSelectorContainer");

  if (!loadTitleBtn || !sourceSelectorContainer) {
    console.error("Missing loadTitleBtn or sourceSelectorContainer.");
    return;
  }

  loadTitleBtn.addEventListener("click", () => {
    // Show the source selector once title is entered
    const titleInput = document.querySelector<HTMLInputElement>("#titleInput");
    if (!titleInput) return;

    if (!titleInput.value.trim()) {
      alert("Please enter a manga title");
      return;
    }

    // Show source selector container
    sourceSelectorContainer.style.display = "block";
  });

  const loadSourceBtn = document.querySelector<HTMLButtonElement>("#loadSourceBtn");
  if (!loadSourceBtn) return;

  loadSourceBtn.addEventListener("click", async () => {
    const titleInput = document.querySelector<HTMLInputElement>("#titleInput");
    const select = document.querySelector<HTMLSelectElement>("#sourceSelect");
    if (!titleInput || !select) return;

    const sourceId = select.value;
    const mangaTitle = titleInput.value.trim();

    if (!sourceId || !mangaTitle) {
      alert("Please select a source and enter a manga title");
      return;
    }

    // Update context with the new title
    const newContext = {
      ...context,
      title: mangaTitle,
    };

    await loadChaptersForSource(sourceId, newContext);
  });

  async function loadChaptersForSource(sourceId: string, mangaContext: typeof context) {
    if (!pagesContainer) {
      console.error("Missing #pages.");
      return;
    }

    let chapters;
    try {
      chapters = await runSourceForChapters(mangaContext, sourceId);
    } catch (err: any) {
      console.error(err);
      app.innerHTML = `<p style="color: red;">Error loading chapters: ${err?.message || ''}</p>`;
      return;
    }

    if (!chapters || chapters.length === 0) {
      app.innerHTML = "<p>No chapters found for this source</p>";
      return;
    }

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
    chapterLinks.forEach(link => {
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
            `<img src="${page.url}" alt="Page ${page.id}" style="max-width: 100%; margin-bottom: 1em;">`
          ).join('');
        } catch (err: any) {
          pagesContainer.innerHTML = `<p style="color: red;">Failed to load pages: ${err?.message || ''}</p>`;
        }
      });
    });
  }
}

main().catch(console.error);
