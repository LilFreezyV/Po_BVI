# -*- coding: utf-8 -*-
"""Сборщик больших интерактивных конспектов по физике.

Готовая страница конспекта — это ~0,7 МБ, но своего в ней ~50 КБ: остальное — встроенные
шрифты, KaTeX и общий движок (спойлеры, каркас рисунков). Поэтому в репозитории лежат только
исходники тем (physics/NN.html + physics/NN.js) и общая оболочка shell.html, а страницы
целиком собирает этот скрипт в dist/.

    python conspects/build.py shell <готовый конспект по математике .html>   # один раз: вынуть оболочку
    python conspects/build.py                                                # собрать всё в dist/physics

Дальше dist/physics загружается в базу так же, как конспекты по математике:
    python -m scripts.load_conspects <…>/conspects/dist/physics --subject physics

Шапку темы, карту подтем, заголовки подтем и шпаргалку сборщик берёт из программы
(backend/scripts/curriculum_*.py), поэтому названия всегда совпадают с базой — загрузчик
это сверяет. В исходнике темы пишутся только сами подтемы короткими тегами (см. TAGS ниже).
"""
import html
import io
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SHELL = ROOT / 'shell.html'
SRC = ROOT / 'physics'
DIST = ROOT / 'dist' / 'physics'

sys.path.insert(0, str(ROOT.parent / 'backend'))
from scripts.curriculum_data import CURRICULUM  # noqa: E402
from scripts.curriculum_topics import TOPICS, parse_ref  # noqa: E402

COURSE_TITLE = 'Олимпиадная физика'

# Стили, которых нет у конспектов по математике: блок вывода с производными и блок модели.
EXTRA_CSS = """
.calc{background:color-mix(in srgb,var(--violet) 7%,var(--card));border-color:color-mix(in srgb,var(--violet) 40%,var(--line))}
.calc>.lbl{color:var(--violet)}
.fig .model{font-size:14px;color:var(--muted)}
.fig .model ul{margin:.4em 0 0;padding-left:1.2em}
canvas{touch-action:pan-y}
"""


# ——— оболочка ———

def extract_shell(page: Path) -> None:
    """Вынимает из готового конспекта всё, кроме содержимого и рисунков темы."""
    h = page.read_text(encoding='utf-8')
    body = h.index('<div class="wrap">')
    scripts = [m.start() for m in re.finditer(r'<script>', h)]
    figs_start = scripts[-1]
    figs_end = h.index('</script>', figs_start) + len('</script>')
    if '/* Движок конспектов' not in h[scripts[-2]:figs_start]:
        raise SystemExit('Не нашёл движок перед рисунками темы — формат конспекта изменился.')
    shell = h[:body] + '{{BODY}}' + h[scripts[0]:figs_start] + '<script>{{FIGS}}</script>' + h[figs_end:]
    shell = re.sub(r'<title>.*?</title>', '<title>{{TITLE}}</title>', shell, count=1, flags=re.S)
    shell = shell.replace('</head>', '<style>{{EXTRA_CSS}}</style></head>', 1)
    SHELL.write_text(shell, encoding='utf-8')
    print(f'оболочка: {SHELL.name}, {len(shell) // 1024} КБ')


# ——— программа ———

def program():
    """Темы физики в порядке программы: название, подтемы (название, описание, классы)."""
    plan = {(c['grade'], l[0]): l for c in CURRICULUM if c['subject'] == 'physics'
            for m in c['modules'] for l in m['lessons']}
    topics = []
    for t in TOPICS:
        lessons = []
        for title_override, refs in t['lessons']:
            keys = [parse_ref(r) for r in refs]
            _, title, desc, _ = plan[keys[0]]
            grades = sorted({g for g, _ in keys})
            lessons.append({'title': title_override or title, 'desc': desc, 'grades': grades})
        topics.append({'slug': t['slug'], 'title': t['title'], 'lessons': lessons})
    return topics


def grades_text(grades):
    return ', '.join(map(str, grades)) + ' класс'


# ——— короткие теги исходника → разметка движка ———

def attrs(s):
    return dict(re.findall(r'(\w+)="([^"]*)"', s))


def expand(src: str, section: int) -> str:
    out = src

    # <eq n="1.2">\[…\]</eq> → нумерованная формула
    out = re.sub(r'<eq n="([^"]+)">(.*?)</eq>',
                 lambda m: f'<div class="eq" id="eq-{m[1]}"><div class="body">{m[2].strip()}</div>'
                           f'<span class="no">({m[1]})</span></div>', out, flags=re.S)
    # <thm n="1.1" t="Закон …">текст</thm>
    out = re.sub(r'<thm ([^>]*)>(.*?)</thm>',
                 lambda m: (lambda a: f'<div class="thm" id="t-{a["n"]}"><span class="lbl">'
                                      f'{a.get("t", "Утверждение")} {a["n"]}</span>{m[2].strip()}</div>')(attrs(m[1])),
                 out, flags=re.S)
    # границы применимости, ошибки, вывод с производными
    for tag, cls, label in (('lim', 'box lim', 'Границы применимости'),
                            ('err', 'box err', 'Типичные ошибки'),
                            ('calc', 'box calc', 'Для 10–11 классов: вывод с производными')):
        out = re.sub(rf'<{tag}>(.*?)</{tag}>',
                     lambda m, cls=cls, label=label: f'<div class="{cls}"><span class="lbl">{label}</span>{m[1].strip()}</div>',
                     out, flags=re.S)
    # приёмы
    out = re.sub(r'<tricks>(.*?)</tricks>',
                 lambda m: '<h3>Олимпиадные приёмы</h3><div class="tricks">' + re.sub(
                     r'<t b="([^"]+)">(.*?)</t>', r'<div class="trick"><b>\1.</b> \2</div>', m[1], flags=re.S) + '</div>',
                 out, flags=re.S)
    # рисунок: <fig id="…" n="1.1" cap="…">описание модели</fig>
    out = re.sub(r'<fig ([^>]*)>(.*?)</fig>',
                 lambda m: (lambda a: f'<figure class="fig wide" data-fig="{a["id"]}" id="fig-{a["id"]}">'
                                      f'<p class="cap"><b>Рис. {a["n"]}.</b> {a["cap"]}</p><div class="figbody"></div>'
                                      f'<details class="model"><summary>Модель</summary>{m[2].strip()}</details></figure>')(attrs(m[1])),
                 out, flags=re.S)

    def part(label, body):
        return f'<div class="part"><span class="lbl">{label}</span>{body.strip()}</div>'

    def pick(body, tag):
        m = re.search(rf'<{tag}>(.*?)</{tag}>', body, re.S)
        return m[1] if m else None

    # разобранная задача
    def wp(m):
        a, body = attrs(m[1]), m[2]
        parts = ''.join(part(lbl, pick(body, tag)) for tag, lbl in
                        (('q', 'Условие'), ('idea', 'Ключевая идея'), ('r', 'Решение'), ('chk', 'Проверка'))
                        if pick(body, tag))
        return (f'<div class="prob wp" id="p-{a["n"]}"><div class="ph"><span class="pn">{a["n"]}</span>'
                f'<span class="src">{a.get("src", "Своя")}</span></div>{parts}</div>')

    out = re.sub(r'<wp ([^>]*)>(.*?)</wp>', wp, out, flags=re.S)
    if '<wp ' in out:
        raise SystemExit(f'подтема {section}: не разобран тег <wp>')

    # задача для самостоятельного решения: подсказка → ответ → решение
    def ex(m):
        a, body = attrs(m[1]), m[2]
        s = int(a.get('s', 1))
        sp = ''.join(f'<div class="sp" data-lbl="{lbl}">{pick(body, tag).strip()}</div>'
                     for tag, lbl in (('h', 'Подсказка'), ('a', 'Ответ'), ('r', 'Решение')))
        return (f'<div class="prob ex" id="p-{a["n"]}"><div class="ph"><span class="pn">{a["n"]}</span>'
                f'<span class="stars" aria-label="сложность {s} из 3">{"★" * s}</span>'
                f'<span class="src">{a.get("src", "Своя")}</span></div>'
                f'{part("Условие", pick(body, "q"))}<div class="spoil"></div>{sp}</div>')

    out = re.sub(r'<ex ([^>]*)>(.*?)</ex>', ex, out, flags=re.S)
    return out


def build_topic(number: int, topic: dict, src: str, figs: str) -> str:
    meta = dict(re.findall(r'^(\w+):\s*(.+)$', re.search(r'<!--meta(.*?)-->', src, re.S)[1], re.M))
    sections = {int(n): body for n, body in re.findall(r'<section n="(\d+)">(.*?)</section>', src, re.S)}
    lessons = topic['lessons']
    if sorted(sections) != list(range(1, len(lessons) + 1)):
        raise SystemExit(f'{topic["title"]}: подтемы в исходнике {sorted(sections)}, а в программе {len(lessons)}')

    grades = sorted({g for l in lessons for g in l['grades']})
    pre = ''.join(f'<li>{x.strip()}</li>' for x in meta['pre'].split('|'))
    card = ''.join(f'<a href="#s{i}"><span class="no">{i:02d}</span><span class="nm">{html.escape(l["title"])}</span>'
                   f'<span class="cl">{grades_text(l["grades"])}</span></a>' for i, l in enumerate(lessons, 1))
    header = (f'<header class="top"><p class="eyebrow">{COURSE_TITLE} · тема {number:02d} · {grades_text(grades)} · '
              f'{len(lessons)} подтем</p><h1>{html.escape(topic["title"])}</h1><p class="lead">{meta["lead"]}</p>'
              f'<h4>Что нужно знать заранее</h4><ul class="pre">{pre}</ul>'
              f'<p class="book">Что почитать: {meta["books"]}</p>'
              f'<h4>Карта темы</h4><nav class="map" aria-label="Подтемы">{card}</nav></header>')

    cheat, body = [], []
    for i, l in enumerate(lessons, 1):
        sec = sections[i]
        items = re.search(r'<cheat>(.*?)</cheat>', sec, re.S)
        if not items:
            raise SystemExit(f'{topic["title"]}, подтема {i}: нет <cheat> для шпаргалки')
        sec = sec.replace(items[0], '')
        cheat.append(f'<div><h4><a href="#s{i}">{i:02d}</a> · {html.escape(l["title"])}</h4><ul>{items[1].strip()}</ul></div>')
        body.append(f'<section id="s{i}" aria-labelledby="h{i}"><div class="sub-head"><span class="num">{i:02d}</span>'
                    f'<h2 id="h{i}">{html.escape(l["title"])}</h2><span class="cl">{grades_text(l["grades"])}</span></div>'
                    f'<p class="sub-desc">{html.escape(l["desc"])}</p>{expand(sec, i)}</section>')
    body.append('<section id="cheat"><div class="sub-head"><span class="num">✦</span><h2>Шпаргалка</h2></div>'
                f'<div class="cheat">{"".join(cheat)}</div></section>')
    footer = ('<footer><p class="muted" style="margin-top:48px;font-size:14px">Задачи с пометкой «своя» составлены для '
              'этого конспекта; у задач с олимпиад указан источник со ссылкой на официальный архив. Все ответы и '
              'числа в анимациях проверены программой.</p></footer>')
    page = f'<div class="wrap">{header}<main>{"".join(body)}</main>{footer}</div>'

    shell = SHELL.read_text(encoding='utf-8')
    return (shell.replace('{{TITLE}}', html.escape(topic['title']))
                 .replace('{{EXTRA_CSS}}', EXTRA_CSS)
                 .replace('{{BODY}}', page)
                 .replace('{{FIGS}}', figs))


def build_toc(topics, ready) -> str:
    """Оглавление курса: готовые темы ссылками, остальные — «готовится»."""
    cards = []
    for i, t in enumerate(topics, 1):
        grades = sorted({g for l in t['lessons'] for g in l['grades']})
        name = f'{i:02d} {t["title"]}.html'
        subs = ''.join(f'<li><span class="sn">{j:02d}</span><span class="st">{html.escape(l["title"])}</span>'
                       f'<span class="sc">{",".join(map(str, l["grades"]))}</span></li>' for j, l in enumerate(t['lessons'], 1))
        link = (f'<h2><a href="{name}">{html.escape(t["title"])}</a></h2>' if i in ready
                else f'<h2>{html.escape(t["title"])}</h2>')
        open_ = (f'<a class="open" href="{name}">Открыть конспект →</a>' if i in ready
                 else '<p class="meta">Конспект готовится</p>')
        cards.append(f'<article class="topic" id="t{i:02d}"><header><span class="num">{i:02d}</span><div class="th">{link}'
                     f'<p class="meta">{grades_text(grades)} · {len(t["lessons"])} подтем</p></div></header>'
                     f'<details><summary>Подтемы</summary><ol>{subs}</ol></details>{open_}</article>')
    lessons = sum(len(t['lessons']) for t in topics)
    body = (f'<div class="wrap"><section class="intro"><p class="eyebrow">Подготовка к перечневым олимпиадам · 9–11 класс</p>'
            f'<h1>{COURSE_TITLE}</h1><p>Интерактивные конспекты по физике: в каждой подтеме теория с выводами и '
            f'границами применимости, олимпиадные приёмы, разобранные задачи и задачи со спойлерами, живые модели '
            f'со сверкой с формулами.</p><div class="stats"><span><b>{len(topics)}</b> тем</span><span><b>{lessons}</b> '
            f'подтем</span><span><b>{len(ready)}</b> готово</span></div></section><div class="grid">{"".join(cards)}'
            f'</div></div>')
    toc = (ROOT / 'toc_shell.html').read_text(encoding='utf-8')
    return toc.replace('{{TITLE}}', COURSE_TITLE).replace('{{BODY}}', body)


def extract_toc_shell(page: Path) -> None:
    h = page.read_text(encoding='utf-8')
    a, b = h.index('<div class="wrap">'), h.rindex('</body>')
    shell = h[:a] + '{{BODY}}' + h[b:]
    shell = re.sub(r'<title>.*?</title>', '<title>{{TITLE}}</title>', shell, count=1, flags=re.S)
    (ROOT / 'toc_shell.html').write_text(shell, encoding='utf-8')
    print(f'оболочка оглавления: toc_shell.html, {len(shell) // 1024} КБ')


def main():
    if len(sys.argv) >= 3 and sys.argv[1] == 'shell':
        extract_shell(Path(sys.argv[2]))
        if len(sys.argv) >= 4:
            extract_toc_shell(Path(sys.argv[3]))
        return

    topics = program()
    DIST.mkdir(parents=True, exist_ok=True)
    ready = set()
    for path in sorted(SRC.glob('[0-9][0-9].html')):
        number = int(path.stem)
        topic = topics[number - 1]
        figs_path = path.with_suffix('.js')
        common = (SRC / 'common.js').read_text(encoding='utf-8')
        figs = common + '\n' + (figs_path.read_text(encoding='utf-8') if figs_path.exists() else '')
        page = build_topic(number, topic, path.read_text(encoding='utf-8'), figs)
        out = DIST / f'{number:02d} {topic["title"]}.html'
        out.write_text(page, encoding='utf-8')
        ready.add(number)
        left = re.findall(r'<(eq|thm|lim|err|calc|tricks|fig|wp|ex|cheat) ', page)
        print(f'{out.name}: {len(page) // 1024} КБ' + (f' — НЕ РАЗВЁРНУТЫ ТЕГИ {set(left)}' if left else ''))
    (DIST / f'00 {COURSE_TITLE}.html').write_text(build_toc(topics, ready), encoding='utf-8')
    print(f'00 {COURSE_TITLE}.html: оглавление, готово тем {len(ready)} из {len(topics)}')


if __name__ == '__main__':
    main()
