"""Package senior-school math PDFs and a page search index into a private archive."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from http.client import HTTPException, HTTPSConnection
from io import BytesIO
import json
from pathlib import Path
import re
from threading import local
from urllib.parse import quote, unquote, urljoin, urlsplit
from zipfile import ZIP_DEFLATED, ZipFile

from lxml import html
from pypdf import PdfReader, PdfWriter
import pypdfium2 as pdfium

KHAM_ARCHIVE = "https://math.mosolymp.ru/archive_khamovniki"
HOSTS = {"math.mosolymp.ru", "www.math.mosolymp.ru"}
CLIENTS = local()
GRADE = re.compile(r"^(?:[а-яё]+[-– ]+)?(9|10|11)(?:[-– ](?:\d{1,2}|класс))?$", re.I)


def read_remote(url, cache):
    key = sha256(url.encode()).hexdigest()
    file = cache / key
    if file.exists():
        return file.read_bytes()
    if not hasattr(CLIENTS, "connections"):
        CLIENTS.connections = {}
    for _ in range(4):
        parsed = urlsplit(url)
        if parsed.scheme != "https" or parsed.netloc not in HOSTS:
            raise ValueError("Неизвестный адрес")
        client = CLIENTS.connections.setdefault(parsed.netloc, HTTPSConnection(parsed.netloc, timeout=12))
        try:
            address = quote(parsed.path, safe="/%:@!$&'()*+,;=-._~")
            if parsed.query:
                address += "?" + quote(parsed.query, safe="=&%+/:;,-._~")
            client.request("GET", address, headers={"User-Agent": "BVI math collections import"})
            response = client.getresponse()
            data = response.read(20_000_001)
            if len(data) > 20_000_000:
                client.close()
                raise ValueError("Файл больше 20 МБ")
        except (OSError, HTTPException):
            client.close()
            continue
        if response.status == 200:
            temporary = file.with_suffix(".part")
            temporary.write_bytes(data)
            temporary.replace(file)
            return data
        if response.status == 404:
            raise ValueError("404")
        if response.status in {301, 302, 307, 308} and response.headers.get("Location"):
            url = urljoin(url, response.headers["Location"])
        elif response.status not in {429, 500, 502, 503, 504}:
            raise ValueError(str(response.status))
    raise ValueError("Источник не ответил")


def parsed_html(url, cache):
    return html.fromstring(read_remote(url, cache), parser=html.HTMLParser(encoding="utf-8"))


def text(node):
    return " ".join(node.text_content().split())


def kham_sources(cache, workers, first_year):
    archive = parsed_html(KHAM_ARCHIVE, cache)
    main = next(table for table in archive.xpath("//table")
                if len(table.xpath(".//a[contains(@href,'khamovniki')]")) > 30)
    groups = {}
    for link in main.xpath(".//a[contains(@href,'khamovniki')]"):
        grade = GRADE.fullmatch(text(link))
        year = re.search(r"20\d{2}", link.get("href"))
        if grade and year and int(year[0]) >= first_year:
            groups[urljoin(KHAM_ARCHIVE, link.get("href"))] = (int(year[0]), int(grade[1]))

    def scan(url):
        try:
            doc = parsed_html(url, cache)
        except (OSError, ValueError) as exc:
            return url, [], str(exc)
        results = []
        for link in doc.xpath("//a[@href]"):
            destination = urljoin(url, link.get("href"))
            parsed = urlsplit(destination)
            if parsed.netloc not in HOSTS or not parsed.path.lower().endswith(".pdf"):
                continue
            title = text(link) or Path(unquote(parsed.path)).stem
            if title.casefold() in {"pdf", "условия", "решения", "задачи"}:
                title += " · " + Path(unquote(parsed.path)).stem
            results.append((destination, title))
        return url, results, None

    by_grade = {}
    problems = {}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for group, links, error in pool.map(scan, groups):
            if error:
                problems[group] = error
                continue
            year, grade = groups[group]
            for url, name in links:
                by_grade.setdefault(grade, {}).setdefault(url, (year, name))
    return by_grade, problems


def outline(reader):
    result = []
    for dest in reader.outline:
        if isinstance(dest, list):
            continue
        page = reader.get_destination_page_number(dest)
        if page is not None and page >= 0 and dest.title.lower() != "решения":
            result.append((page + 1, dest.title.strip()))
    return result


def dotted_contents(reader, count):
    toc = []
    for page in reader.pages[:count]:
        for line in (page.extract_text() or "").splitlines():
            match = re.fullmatch(r"(\d+\s+\D.*?)\s+(\d+)", line.strip())
            if match:
                toc.append((int(match[2]), match[1]))
    return toc


def sections(reader, key, data):
    if key == "kanel-belov":
        return [(1, "Введение и оглавление"), (6, "Идеи и методы решения задач"),
                (64, "Задачи для 9 класса"), (71, "Задачи для 10 класса"),
                (75, "Задачи для 11 класса"), (80, "Приложение")]
    if key == "karpov-kruzhok":
        return dotted_contents(reader, 2)
    if key == "prasolov-stereometry":
        chapters = []
        # Оглавление этого издания набрано с разрядкой, PDF-закладок нет.
        with pdfium.PdfDocument(data) as pdf:
            for index in range(2, 6):
                page = pdf[index]
                textpage = page.get_textpage()
                try:
                    for line in textpage.get_text_range().splitlines():
                        match = re.fullmatch(r"Г\s*л\s*а\s*в\s*а\s*(\d+)\.\s*(.*?)\s+(\d+)", line.strip())
                        if match:
                            title = match[2].replace("\ufffe", "")
                            chapters.append((int(match[3]), f"Глава {match[1]}. {title}"))
                finally:
                    textpage.close()
                    page.close()
        if len(chapters) != 22:
            raise ValueError(f"В оглавлении стереометрии ожидалось 22 главы, прочитано {len(chapters)}")
        return chapters
    return outline(reader)


class Snapshot:
    def __init__(self, output):
        self.output = output
        self.books = []
        self.chapters = []
        self.assets = {}

    def book(self, slug, title, description, grade):
        book = {"slug": "math-" + slug, "title": title, "description": description,
                "eyebrow": grade, "subject": "math", "chapters": []}
        self.books.append(book)
        return book

    def add_pdf(self, archive, book, data, name, heading, starts=(), group=None):
        if not data.startswith(b"%PDF-"):
            raise ValueError("Источник вернул данные без сигнатуры PDF")
        pdf = pdfium.PdfDocument(data)
        try:
            total = len(pdf)
            if total == 0:
                raise ValueError("Пустой PDF")
            asset = sha256(data).hexdigest()
            if asset not in self.assets:
                archive.writestr("assets/" + asset, data)
                self.assets[asset] = {"name": name, "mime": "application/pdf"}
            index = {p: title for p, title in reversed(list(starts)) if 1 <= p <= total}
            index.setdefault(1, heading)
            boundaries = sorted(index)
            for i, first in enumerate(boundaries):
                last = boundaries[i + 1] - 1 if i + 1 < len(boundaries) else total
                number = len(book["chapters"]) + 1
                meta = {"number": number, "title": index[first], "sections": [],
                        "pdf": {"asset": asset, "name": name, "first": first, "last": last, "total": total}}
                if group:
                    meta["group"] = group
                tasks = []
                for page_number in range(first, last + 1):
                    page = pdf[page_number - 1]
                    try:
                        chars = page.get_textpage()
                        try:
                            statement = " ".join(chars.get_text_range().split()).replace("\x00", "")
                        finally:
                            chars.close()
                    finally:
                        page.close()
                    tasks.append({"anchor": f"page-{page_number}", "number": str(page_number),
                                  "statement": statement})
                book["chapters"].append(meta)
                self.chapters.append({"book": book["slug"], "number": number, "html": "", "tasks": tasks})
        finally:
            pdf.close()


BOOKS = [
    ("kanel-belov", "Как решают нестандартные задачи", "А. Я. Канель-Белов, А. К. Ковальджи. Методы и задачи для 9–11 классов."),
    ("alfutova", "Алгебра и теория чисел", "Н. Б. Алфутова, А. В. Устинов. Задачи для математических школ с указаниями и решениями."),
    ("prasolov-planimetry", "Задачи по планиметрии", "В. В. Прасолов. Задачи и решения по геометрии на плоскости."),
    ("prasolov-stereometry", "Задачи по стереометрии", "В. В. Прасолов. Геометрия в пространстве."),
    ("karpov-kruzhok", "Теория графов", "Д. В. Карпов. Авторский курс математического кружка."),
]


def above_grade_eight(data):
    reader = PdfReader(BytesIO(data))
    if len(reader.pages) != 96:
        raise ValueError("Для исключения задач 8 класса ожидается издание Канель-Белова и Ковальджи на 96 страниц")
    writer = PdfWriter()
    for i, page in enumerate(reader.pages, start=1):
        if not 65 <= i <= 67:
            writer.add_page(page)
    stream = BytesIO()
    writer.write(stream)
    return stream.getvalue()


def build(args):
    cache = args.sources / "kham-cache"
    cache.mkdir(exist_ok=True)
    snapshot = Snapshot(args.output)
    unavailable = {}
    with ZipFile(args.output.with_suffix(".part"), "w", compression=ZIP_DEFLATED) as archive:
        for key, title, description in BOOKS:
            path = args.sources / (key + ".pdf")
            if not path.is_file():
                continue
            data = path.read_bytes()
            if key == "kanel-belov":
                data = above_grade_eight(data)
            book = snapshot.book(key, title, description, "9–11 классы")
            snapshot.add_pdf(archive, book, data, path.name, title, sections(PdfReader(BytesIO(data)), key, data))
            print(f"{key}: {len(book['chapters'])} глав", flush=True)
        msu = sorted(args.sources.glob("msu-*.pdf"), reverse=True)
        if msu:
            book = snapshot.book("msu", "Вступительные работы Малого мехмата МГУ",
                                 "Вступительные работы по математике. Условия и решения.", "9–11 классы")
            for path in msu:
                year = int(path.stem.split("-")[-1])
                snapshot.add_pdf(archive, book, path.read_bytes(), path.name, f"{year}–{year + 1}")
        if not args.books_only:
            by_grade, unavailable = kham_sources(cache, args.workers, args.first_year)
            for grade, links in sorted(by_grade.items()):
                print(f"Хамовники, {grade} класс: найдено {len(links)} PDF", flush=True)
                book = snapshot.book(f"khamovniki-{grade}", f"Математический кружок в Хамовниках · {grade} класс",
                                     "Листки, задания и решения из архива занятий ЦПМ.", f"{grade} класс")
                jobs = sorted(links, key=lambda url: -links[url][0])

                def fetch(url):
                    try:
                        return read_remote(url, cache), None
                    except (OSError, ValueError) as exc:
                        return None, str(exc)

                with ThreadPoolExecutor(max_workers=args.workers) as pool:
                    for i, (url, (data, error)) in enumerate(zip(jobs, pool.map(fetch, jobs)), start=1):
                        year, title = links[url]
                        try:
                            if error:
                                raise ValueError(error)
                            name = Path(unquote(urlsplit(url).path)).name
                            snapshot.add_pdf(archive, book, data, name, title,
                                             group=f"{year - 1}–{year}")
                        except (ValueError, pdfium.PdfiumError) as exc:
                            unavailable[url] = str(exc)
                        if i % 100 == 0:
                            print(f"Хамовники, {grade} класс: обработано {i}/{len(jobs)}", flush=True)
                if not book["chapters"]:
                    snapshot.books.remove(book)
        for book in snapshot.books:
            book["count"] = "Разделов: " + str(len(book["chapters"]))
        payload = {"version": 1, "subject": "math", "books": snapshot.books, "chapters": snapshot.chapters,
                   "assets": snapshot.assets, "failures": {}, "unavailable_sources": unavailable}
        archive.writestr("manifest.json", json.dumps(payload, ensure_ascii=False))
    args.output.with_suffix(".part").replace(args.output)
    print(f"{len(snapshot.books)} сборников, {len(snapshot.chapters)} разделов, "
          f"{len(snapshot.assets)} PDF, недоступных ссылок: {len(unavailable)}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--sources", required=True, type=Path, help="папка с оригиналами PDF")
    parser.add_argument("--workers", type=int, default=8, choices=range(1, 13))
    parser.add_argument("--first-year", type=int, default=2014, help="первый год выпуска в архиве Хамовников")
    parser.add_argument("--books-only", action="store_true", help="собрать локальные книги без архива Хамовников")
    build(parser.parse_args())
