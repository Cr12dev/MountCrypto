import hashlib
from scrapers.base import BaseScraper
from models import Article, Source
from utils.filters import is_relevant
from utils.translator import translate


EXTRACT_JS = """
() => {
  const items = [];
  const seen = new Set();

  const containers = document.querySelectorAll('article, div[class*="noticia"], div[class*="card"], div[class*="article"]');

  containers.forEach(el => {
    const linkEl = el.tagName === 'A' ? el : el.querySelector('a');
    const href = linkEl ? linkEl.getAttribute('href') || '' : '';

    const titleEl = el.querySelector('h1, h2, h3, [class*="titulo"], [class*="title"]');
    const title = titleEl ? titleEl.innerText.trim() : '';

    if (!title || seen.has(title)) return;
    seen.add(title);

    const summaryEl = el.querySelector('p, [class*="description"], [class*="entradilla"]');
    const summary = summaryEl ? summaryEl.innerText.trim() : '';

    const imgEl = el.querySelector('img');
    const imageUrl = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '') : '';

    items.push({ title, summary, link: href, image_url: imageUrl.startsWith('//') ? 'https:' + imageUrl : imageUrl });
  });

  return items;
}
"""


class Antena3Scraper(BaseScraper):
    source = Source.ANTENA3
    label = "Antena 3"
    base_url = "https://www.antena3.com"

    CATEGORY_URLS = [
        "https://www.antena3.com/economia/",
        "https://www.antena3.com/noticias/",
    ]

    def scrape(self) -> list[Article]:
        articles: list[Article] = []
        seen = set()

        for url in self.CATEGORY_URLS:
            items = self._fetch_playwright(url, extract_js=EXTRACT_JS)

            for item in items:
                text = f"{item.get('title', '')} {item.get('summary', '')}"
                if not text.strip():
                    continue

                title_en, translated = translate(item.get("title", ""), "es")
                summary_en, _ = translate(item.get("summary", ""), "es")

                combined = f"{title_en} {summary_en}"
                if not is_relevant(combined):
                    continue

                item["title"] = title_en
                item["summary"] = summary_en

                key = hashlib.md5(
                    (title_en + item.get("link", "")).encode()
                ).hexdigest()[:12]
                if key in seen:
                    continue
                seen.add(key)

                article = self._build_article(item, key)
                article.translated = translated
                articles.append(article)

        return articles
