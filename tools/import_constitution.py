"""Import the official Legislative Department PDF into the API's local source index.

Usage:
    python tools/import_constitution.py data/constitution-official.pdf

The generated JSON is an immutable build artefact. Re-run this script whenever a
new official consolidated edition is reviewed and approved for the application.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "apps" / "api" / "src" / "generated-corpus.json"
ARTICLE = re.compile(r"(?m)^\s*(\d{1,3}[A-Z]?)\.\s+([^\n]{3,}?)\.—")


def normalise(text: str) -> str:
    """Remove running headers and normalise PDF whitespace without changing words."""
    text = re.sub(r"(?m)^\s*\d+\s+THE CONSTITUTION OF INDIA\s*$", "", text)
    text = re.sub(r"(?m)^\s*THE CONSTITUTION OF INDIA\s*$", "", text)
    text = re.sub(r"(?m)^\s*\(Part [^)]+\)\s*$", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def keywords(identifier: str, title: str, text: str) -> list[str]:
    """Store meaningful title/text terms for deterministic local retrieval."""
    words = re.findall(r"[A-Za-z]{4,}", f"{identifier} {title} {text}".lower())
    ignored = {"shall", "this", "that", "with", "under", "which", "from", "have", "been", "were"}
    return sorted({word for word in words if word not in ignored})


def main(pdf_path: Path) -> None:
    raw = pdf_path.read_bytes()
    pages = [page.extract_text() or "" for page in PdfReader(pdf_path).pages]
    document = normalise("\n".join(pages))
    matches = list(ARTICLE.finditer(document))
    articles = []

    for index, match in enumerate(matches):
        identifier = f"Article {match.group(1)}"
        title = normalise(match.group(2)).replace("\n", " ")
        end = matches[index + 1].start() if index + 1 < len(matches) else len(document)
        text = normalise(document[match.start() : end])
        # Ignore table-of-contents matches and retain one complete record per Article.
        if len(text) < 120 or identifier in {article["identifier"] for article in articles}:
            continue
        text = text[len(match.group(0)) :].strip()
        articles.append(
            {
                "id": f"article-{match.group(1).lower()}",
                "identifier": identifier,
                "title": title,
                "text": text,
                "keywords": keywords(identifier, title, text),
                "contentStatus": "machine_checked",
            }
        )

    if len(articles) < 300:
        raise RuntimeError(f"Only extracted {len(articles)} Articles; source layout needs review.")

    payload = {
        "source": {
            "name": "Constitution of India",
            "version": "Legislative Department consolidated edition (10 September 2026)",
            "retrievedAt": "2026-11-16",
            "url": "https://www.legislative.gov.in/static/uploads/2025/08/b9a933fb88c0a5afba254256bc55a3f0.pdf",
            "sha256": hashlib.sha256(raw).hexdigest(),
            "status": "machine_checked",
            "demo": False,
        },
        "articles": articles,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(articles)} Articles to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python tools/import_constitution.py <official-constitution.pdf>")
    main(Path(sys.argv[1]))
