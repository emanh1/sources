# manga_web sources
Scrape mangas from multiple sources!
# Quick start
If you don't want to mess with code, clone the repository:
```bash
git clone https://github.com/emanh1/sources.git
cd sources
npm install && npm run dev
```
after it finishes, open http://localhost:5173 in your web browser to test it out!
## Installation
```bash
npm install https://github.com/emanh1/sources.git
```
## Scrape your first item
To get started with scraping on the **server**, first you have to make an instance:

```typescript
import { targets, makeSources, makeStandardFetcher } from "@manga_web/sources";

const fetcher = makeStandardFetcher(fetch);
export const sources = makeSources({
  fetcher,
  target: targets.ANY,
});
```

Now you have an instace of the controller you can use anywhere. Let's scrape something:
```typescript
const output = await sources.runAllForMangas({
    titleInput
})
```
This will scrape from **all** sources for the titleInput (**slow**):
If you want to scrape from a specific source:
```typescript
const output = await sources.runSourceForMangas({
    sourceId
    titleInput
})
```

# Credits
Fetcher code taken from https://github.com/p-stream/providers
