Harbor manga sources — corrected set

3asq:
- Arabic language fixed to `ar`.
- Chapters are fetched from the site's AJAX endpoint.
- Reader images are taken from .reading-content.

MangaDex:
- This is a Harbor PLUGIN, not a simple CSS-only JSON source.
- It uses MangaDex's public API for manga/chapter metadata and the at-home server for page URLs.
- It is Arabic-only by design to avoid the app treating English chapters as the source language.

MangaLik:
- Updated browse path to the site's current /latest/ pages.
- The simple JSON scraper may still fail intermittently if the site presents CAPTCHA/anti-bot responses.
