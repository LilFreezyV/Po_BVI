import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'

const [, , archivePath, outputPath = 'public/olympiad-content'] = process.argv
if (!archivePath) throw new Error('Usage: node scripts/import-olympiad-archive.mjs <archive-directory> [output-directory]')

const input = resolve(archivePath)
const output = resolve(outputPath)
const manifest = JSON.parse(await readFile(join(input, 'manifest.json'), 'utf8'))
if (manifest.pending.length || manifest.failures.length) throw new Error('The source archive has pending downloads or errors')
const sourceOrigin = new URL(manifest.seed).origin
const tags = new Set('p div span b strong i em sup sub ol ul li table thead tbody tfoot tr td th caption figure figcaption br hr code pre blockquote h3 h4'.split(' '))
const entity = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', ndash: '–', mdash: '—', laquo: '«', raquo: '»', minus: '−', hellip: '…' }
const links = /^\/olimpiady\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/
const groups = new Map()
const images = new Map()
let taskCount = 0
let solutionCount = 0
let statementCount = 0

function decode(text) {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, value) => {
    if (!value.startsWith('#')) return entity[value] ?? match
    const code = value[1].toLowerCase() === 'x' ? Number.parseInt(value.slice(2), 16) : Number(value.slice(1))
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
  })
}

function plain(html) {
  return decode(html.replace(/<[^>]*>/g, '')).trim()
}

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function attribute(tag, name) {
  const match = tag.match(new RegExp('\\s' + name + '\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27)', 'i'))
  return decode(match?.[1] ?? match?.[2] ?? '')
}

function content(html, source) {
  return html
    .replace(/<!--[\s\S]*?-->|<(script|style|iframe|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .split(/(<\/?[a-z][\w:-]*\b(?:[^>"']|"[^"]*"|'[^']*')*>)/gi)
    .map((tag, index) => {
      if (index % 2 === 0) return tag.replaceAll('<', '&lt;')
      const name = tag.match(/^<\/?([\w:-]+)/)[1].toLowerCase()
      if (name === 'img' && !tag.startsWith('</')) {
        const value = attribute(tag, 'data-src') || attribute(tag, 'src')
        if (!value) throw new Error('Image URL missing in ' + source)
        const url = new URL(value, source).href
        const file = manifest.images[url]
        if (!file || !/^images\/[a-f0-9]{24}\.[a-z0-9]{1,6}$/i.test(file)) throw new Error('Missing image: ' + url)
        images.set(url, file)
        return '<img src="./olympiad-content/' + file + '" alt="' + escapeAttribute(attribute(tag, 'alt')) + '" loading="lazy">'
      }
      if (!tags.has(name)) return ''
      if (tag.startsWith('</')) return '</' + name + '>'
      const attributes = ['colspan', 'rowspan', 'start', 'value']
        .map((attr) => [attr, attribute(tag, attr)])
        .filter(([, value]) => /^\d{1,3}$/.test(value))
        .map(([attr, value]) => ' ' + attr + '="' + value + '"').join('')
      return '<' + name + attributes + '>'
    }).join('').trim()
}

function officialLinks(html, source) {
  const markup = html.match(/<p class="o-src">([\s\S]*?)<\/p>/)?.[1] ?? ''
  return [...markup.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].flatMap(([tag, label]) => {
    const url = new URL(attribute(tag, 'href'), source)
    return ['http:', 'https:'].includes(url.protocol) && url.origin !== sourceOrigin && !url.username && !url.password
      ? [[plain(label), url.href]] : []
  })
}

async function parseVariant(source, file) {
  if (!/^pages\/[a-f0-9]{24}\.html$/i.test(file)) throw new Error('Unexpected page path: ' + file)
  const html = await readFile(join(input, file), 'utf8')
  const heading = plain(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '')
  if (!heading) throw new Error('Missing heading for ' + source)
  const main = html.split(/<main\b[^>]*>/i)[1]?.split(/<p class="o-src"|<\/main>/i)[0] ?? ''
  const sections = main.split(/<div class="o-zad" id="z([^"]+)">/).slice(1)
  const tasks = []

  for (let i = 0; i < sections.length; i += 2) {
    const number = sections[i]
    const section = sections[i + 1]
    const header = section.match(/^([\s\S]*?<\/h2>[\s\S]*?<\/div>\s*(?:<p class="o-pdf">[\s\S]*?<\/p>\s*)?<\/div>)/)
    if (!header) throw new Error('Missing task header: ' + source + '#' + number)
    const title = plain(header[0].match(/<h2 class="o-zh">[\s\S]*?<\/span>([\s\S]*?)<\/h2>/)?.[1] ?? '')
    const rating = Number(header[0].match(/сложность\s+(\d+)\/10/i)?.[1]) || undefined
    const body = section.slice(header[0].length)
    const details = Object.fromEntries([...body.matchAll(/<details\b[^>]*>\s*<summary>[\s\S]*?<span class="when-closed">([^<]+)<\/span>[\s\S]*?<\/summary>\s*<div class="sol">\s*<span class="lbl">[^<]*<\/span>([\s\S]*?)<\/div>\s*<\/details>/gi)]
      .map(([, label, inner]) => [label.trim(), content(inner.replace(/<p class="o-posle">[\s\S]*?<\/p>/g, ''), source)]))
    if (Object.keys(details).length !== [...body.matchAll(/<details\b/g)].length) throw new Error('Unrecognized disclosure: ' + source + '#' + number)
    const statement = content(body.split(/<div class="sd-wrap"|<details\b/)[0], source)
    if (!title) throw new Error('Missing task title: ' + source + '#' + number)
    tasks.push({ id: number, number, title, rating, rich: {
      statement, hint: details['Подсказка'], answer: details['Ответ'], solution: details['Решение'],
    } })
  }

  if (!tasks.length || new Set(tasks.map((task) => task.number)).size !== tasks.length) throw new Error('Invalid task list: ' + source)
  const expected = [...main.matchAll(/href="#z([^"]+)"/g)].map(([, number]) => number)
  if (expected.length && expected.join() !== tasks.map((task) => task.number).join()) throw new Error('Task list differs from source navigation: ' + source)
  return { heading, tasks, official: officialLinks(html, source) }
}

async function save(name, value) {
  const target = join(output, name)
  await writeFile(target + '.part', JSON.stringify(value))
  await rename(target + '.part', target)
}

await mkdir(join(output, 'variants'), { recursive: true })
await mkdir(join(output, 'images'), { recursive: true })

for (const [source, file] of Object.entries(manifest.pages)) {
  const match = new URL(source).pathname.match(links)
  if (!match) continue
  const [, sourceId, slug] = match
  if (sourceId === 'ege') continue
  const { heading, tasks, official } = await parseVariant(source, file)
  const olympiad = sourceId === 'fiztekh' ? 'fizteh' : sourceId
  const id = olympiad === 'fizteh' && /^2024-25-zakl-\d+-var-(?:1-4|5-6|1-2|3-4)$/.test(slug)
    ? slug.replace('-zakl-', '-final-').replace('-var-', '-') : slug
  const season = heading.match(/\b\d{4}(?:\/\d{2})?\b/)?.[0] ?? slug.slice(0, 4)
  const title = heading.split(season)[0].trim().replace(/,$/, '')
  const grade = heading.match(/(\d+(?:[–-]\d+)?)\s+класс/i)?.[1]
  const stage = heading.match(/(?:заключительный|отборочный|региональный|муниципальный|школьный)\s+этап/i)?.[0]
  const filename = olympiad + '--' + slug + '.json'
  if (!groups.has(olympiad)) groups.set(olympiad, { id: olympiad, title, variants: [] })
  groups.get(olympiad).variants.push({
    id, season, heading, grade, stage, filename, official,
    tasks: tasks.map(({ number, title: taskTitle, rating }) => ({ number, title: taskTitle, rating })),
  })
  await save('variants/' + filename, tasks)
  taskCount += tasks.length
  statementCount += tasks.filter(({ rich }) => rich.statement).length
  solutionCount += tasks.filter(({ rich }) => rich.solution).length
}

for (const file of new Set(images.values())) await copyFile(join(input, file), join(output, 'images', basename(file)))
const olympiads = [...groups.values()]
await save('index.json', olympiads)
console.log(JSON.stringify({ olympiads: olympiads.length, variants: olympiads.reduce((n, olympiad) => n + olympiad.variants.length, 0),
  tasks: taskCount, statements: statementCount, solutions: solutionCount, images: new Set(images.values()).size }))
