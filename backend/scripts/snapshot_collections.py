"""Build a private ZIP for the one-time import of the physics collections."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from http.client import HTTPException, HTTPSConnection
import json
from pathlib import Path
import re
from threading import local
from urllib.error import HTTPError
from urllib.parse import urljoin, urlsplit
from zipfile import ZIP_DEFLATED, ZipFile

from lxml import html

ORIGIN = "https://botay.pro"
BOOKS = {
    "/savchenko/": "savchenko",
    "/kalda/mehanika/": "kalda-mechanics",
    "/kalda/kinematika/": "kalda-kinematics",
    "/kalda/cepi/": "kalda-circuits",
    "/kalda/termodinamika/": "kalda-thermodynamics",
    "/kalda/optika/": "kalda-wave-optics",
    "/trushnikov/": "trushnikov",
}
MEDIA = {
    ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp",
    ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".gif": "image/gif",
    ".pdf": "application/pdf", ".tex": "text/plain",
}
TAGS = set("""
    a abbr article aside b blockquote br caption code dd del details div dl dt em
    figcaption figure h2 h3 h4 h5 h6 hr i img kbd li mark ol p pre q s section
    small span strong sub summary sup table tbody td th thead tfoot tr u ul var
""".split())
DROP = {"script", "style", "iframe", "form", "button", "input", "template", "svg", "object", "embed"}
SAFE_ID = re.compile(r"[a-zA-Z0-9_.:-]+\Z")
CONNECTIONS = local()


def by_class(node, name):
    return node.xpath(f'.//*[contains(concat(" ", normalize-space(@class), " "), " {name} ")]')


def plain(node):
    return " ".join(node.text_content().split()) if node is not None else ""


def first_class(node, name):
    return next(iter(by_class(node, name)), None)


def get_remote(url):
    if not hasattr(CONNECTIONS, "client"):
        CONNECTIONS.client = HTTPSConnection("botay.pro", timeout=18)
    client = CONNECTIONS.client
    for _ in range(4):
        parts = urlsplit(url)
        if parts.scheme != "https" or parts.netloc != "botay.pro":
            raise ValueError("Источник перенаправил запрос на другой сайт")
        target = parts.path + (f"?{parts.query}" if parts.query else "")
        try:
            client.request("GET", target, headers={"User-Agent": "BVI collections import/1.0"})
            response = client.getresponse()
            body = response.read(20_000_001)
            mime = response.headers.get_content_type()
            if len(body) > 20_000_000:
                client.close()
                raise ValueError("Файл превышает 20 МБ")
        except (OSError, HTTPException):
            client.close()
            raise
        if response.status == 200:
            return mime, body
        if response.status in {301, 302, 303, 307, 308} and response.headers.get("Location"):
            url = urljoin(url, response.headers["Location"])
            continue
        raise HTTPError(url, response.status, response.reason, response.headers, None)
    raise ValueError("Слишком много редиректов")


def page(path, cache):
    file = cache / (path.strip("/").replace("/", "-") + ".html")
    if not file.exists():
        _, body = get_remote(ORIGIN + path)
        file.write_bytes(body)
    return html.fromstring(file.read_bytes(), parser=html.HTMLParser(encoding="utf-8"), base_url=ORIGIN + path)


def chapter_href(book_path, href):
    part = urlsplit(urljoin(ORIGIN + book_path, href))
    suffix = part.path.removeprefix(book_path)
    if part.netloc == "botay.pro" and part.path.startswith(book_path) and re.fullmatch(r"[0-9]+/", suffix):
        return int(suffix.rstrip("/")), part.fragment
    return None


def table_of_contents(toc, path):
    chapters = {}
    links = toc.xpath('//a[@href]')
    for link in links:
        match = chapter_href(path, link.get("href"))
        title = re.sub(r"(?<=\d\.)(?=[А-ЯЁ])", " ", plain(link))
        if not match or not title:
            continue
        number, anchor = match
        chapter = chapters.setdefault(number, {"number": number, "title": "", "sections": []})
        if anchor:
            if not any(entry["anchor"] == anchor for entry in chapter["sections"]):
                chapter["sections"].append({"anchor": anchor, "title": title})
        elif not chapter["title"]:
            chapter["title"] = title
    if not chapters or any(not c["title"] for c in chapters.values()):
        raise ValueError(f"Не удалось прочитать оглавление {path}")
    return list(chapters.values())


def search_rows(main):
    rows = {}
    tasks = by_class(main, "problem") + by_class(main, "k-zad")
    for task in tasks:
        number_node = first_class(task, "pnum")
        if number_node is None:
            number_node = first_class(task, "k-num")
        if number_node is None:
            continue
        anchor = task.get("id") or number_node.get("id")
        if not anchor or not SAFE_ID.fullmatch(anchor):
            continue
        condition = first_class(task, "cond")
        rows.setdefault(anchor, {"anchor": anchor, "number": plain(number_node),
                                 "statement": plain(condition if condition is not None else task)})
    return list(rows.values())


def clean_chapter(main, page_path, assets):
    for node in list(main.iterdescendants()):
        if not isinstance(node.tag, str):
            if node.getparent() is not None:
                node.getparent().remove(node)
            continue
        if node.getparent() is None:
            continue
        tag = node.tag
        classes = (node.get("class") or "").split()
        if tag in DROP or set(classes) & {"navfloat", "toplink", "when-open", "arr", "chfoot", "pfooter"}:
            node.drop_tree()
            continue
        if tag not in TAGS:
            node.drop_tag()
            continue
        attrs = dict(node.attrib)
        node.attrib.clear()
        for name in ("id", "class", "alt", "title", "width", "height", "colspan", "rowspan", "start"):
            if name in attrs:
                node.set(name, attrs[name])
        if tag == "img":
            node.set("loading", "lazy")
        remote = attrs.get("src" if tag == "img" else "href") if tag in {"img", "a"} else None
        if not remote:
            continue
        url = urljoin(ORIGIN + page_path, remote)
        parts = urlsplit(url)
        if parts.scheme != "https":
            continue
        suffix = Path(parts.path).suffix.lower()
        if parts.netloc == "botay.pro" and suffix in MEDIA:
            asset_id = sha256(url.encode()).hexdigest()
            assets[asset_id] = {"url": url, "mime": MEDIA[suffix], "name": Path(parts.path).name}
            node.set("data-asset", asset_id)
            if tag == "a":
                node.set("data-name", Path(parts.path).name)
        elif tag == "a":
            if remote.startswith("#") and SAFE_ID.fullmatch(remote[1:]):
                node.set("href", remote)
                continue
            for path, slug in BOOKS.items():
                match = chapter_href(path, url)
                if match:
                    number, anchor = match
                    route = f"#/collections/{slug}/{number}"
                    if SAFE_ID.fullmatch(anchor):
                        route += f"?at={anchor}"
                    node.set("href", route)
                    break
                if parts.netloc == "botay.pro" and parts.path == path:
                    node.set("href", f"#/collections/{slug}")
                    break
            else:
                node.set("href", url)
                node.set("rel", "noopener noreferrer")
                node.set("target", "_blank")
    return "".join(html.tostring(node, encoding="unicode") for node in main)


def download_asset(item, cache):
    asset_id, meta = item
    file = cache / asset_id
    if not file.exists():
        for attempt in range(3):
            try:
                mime, body = get_remote(meta["url"])
                if not body or mime in {"text/html", "application/xhtml+xml"}:
                    raise ValueError(f"Вместо файла получен {mime}")
                temporary = file.with_suffix(".part")
                temporary.write_bytes(body)
                temporary.replace(file)
                break
            except (OSError, HTTPException, ValueError) as exc:
                if attempt == 2 or isinstance(exc, HTTPError) and exc.code in {401, 403, 404, 410}:
                    return asset_id, str(exc)
    return asset_id, None


def build(cache, output, workers):
    cards = {a.get("href"): a for a in by_class(page("/sborniki/", cache), "plate")}
    books, chapters, assets = [], [], {}
    for path, slug in BOOKS.items():
        card = cards[path]
        toc_page = page(path, cache)
        toc = table_of_contents(toc_page, path)
        hero = first_class(toc_page, "shero")
        stats = first_class(hero, "meta") if hero is not None else None
        books.append({
            "slug": slug, "title": plain(first_class(card, "plate-t")),
            "description": plain(first_class(card, "plate-d")),
            "eyebrow": plain(first_class(card, "plate-lvl")), "count": plain(first_class(card, "plate-m")),
            "intro": plain(first_class(hero, "sub")) if hero is not None else "",
            "stats": [plain(node) for node in stats] if stats is not None else [],
            "source": ORIGIN + path, "chapters": toc,
        })
        for chapter in toc:
            page_path = f'{path}{chapter["number"]}/'
            main = page(page_path, cache).xpath("//main")
            if not main:
                raise ValueError(f"В главе нет основного текста: {page_path}")
            chapters.append({"book": slug, "number": chapter["number"], "tasks": search_rows(main[0]),
                             "html": clean_chapter(main[0], page_path, assets)})
        print(f"{slug}: {len(toc)} глав; {sum(len(c['tasks']) for c in chapters if c['book'] == slug)} задач", flush=True)
    asset_cache = cache / "assets"
    asset_cache.mkdir(exist_ok=True)
    failures = {}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for index, (asset_id, error) in enumerate(pool.map(lambda item: download_asset(item, asset_cache), assets.items()), 1):
            if error:
                failures[asset_id] = error
            if index % 250 == 0:
                print(f"Файлы: {index}/{len(assets)}, недоступно: {len(failures)}", flush=True)
    manifest = {"version": 1, "books": books, "chapters": chapters, "assets": assets, "failures": failures}
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(".part")
    with ZipFile(temporary, "w", compression=ZIP_DEFLATED) as bundle:
        bundle.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False))
        for asset_id in assets.keys() - failures.keys():
            bundle.write(asset_cache / asset_id, f"assets/{asset_id}")
    temporary.replace(output)
    print(f"{len(books)} сборников, {len(chapters)} глав, {len(assets) - len(failures)} файлов; недоступно: {len(failures)}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--cache", required=True, type=Path)
    parser.add_argument("--workers", type=int, default=5, choices=range(1, 9))
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    build(args.cache, args.output, args.workers)
