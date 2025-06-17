import { runAllSourcesForChapters, gatherAllSources } from "../dist/sources";

const proxyBase = 'https://simple-proxy-pnor.onrender.com/?destination=';

const context = {
  title: "One Piece",
  proxiedFetcher: async (url: string) => {
    const proxiedUrl = proxyBase + encodeURIComponent(url);
    const response = await fetch(proxiedUrl);
    const data = await response.text();
    return { data };
  }
};

async function fetchPagesForChapter(sourceId: string, chapter: any) {
  const sources = gatherAllSources();
  const source = sources.find(src => src.id === sourceId);
  if (!source) {
    throw new Error(`Source ${sourceId} not found`);
  }

  const ctx = {
    ...context,
    ...chapter
  };
  return await source.scrapePagesofChapter(ctx);
}

async function main() {
  const chaptersBySource = await runAllSourcesForChapters(context);

  const app = document.querySelector("#app");
  const pagesContainer = document.querySelector("#pages");

  if (app && pagesContainer) {
    app.innerHTML = `
      <h1>Chapters from all sources</h1>
      <ul>
        ${Object.entries(chaptersBySource).flatMap(([sourceId, chapters]) =>
          chapters.map(ch => 
            `<li>
              ${sourceId} — Ch.${ch.chapterNumber} — 
              <a href="#" data-source="${sourceId}" data-chapter='${JSON.stringify(ch)}'>Read</a>
            </li>`
          ).join('')
        ).join('')}
      </ul>
    `;

    app.querySelectorAll('a[data-source]').forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const target = e.currentTarget as HTMLAnchorElement;
        const sourceId = target.getAttribute('data-source')!;
        const chapter = JSON.parse(target.getAttribute('data-chapter')!);

        pagesContainer.innerHTML = `<p>Loading pages for Chapter ${chapter.chapterNumber}...</p>`;

        try {
          const pages = await fetchPagesForChapter(sourceId, chapter);

          pagesContainer.innerHTML = pages.map((page: any) => 
            `<img src="${page.url}" alt="Page ${page.id + 1}" style="max-width: 100%; margin-bottom: 1em;">`
          ).join('');
        } catch (err) {
          pagesContainer.innerHTML = `<p style="color: red;">Failed to load pages: ${err.message}</p>`;
        }
      });
    });
  }
}

main().catch(err => console.error(err));

