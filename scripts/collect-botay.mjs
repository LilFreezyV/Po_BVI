import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const origin = 'https://botay.pro'
const catalog = origin + '/zadachi/varianty/'
const [, , outputDirectory, seed = catalog] = process.argv

if (!outputDirectory) {
  console.error('Usage: node scripts/collect-botay.mjs <output-directory> [catalog-or-variant-url]')
  process.exit(2)
}

const output = resolve(outputDirectory)
const pageRoute = /^\/(?:zadachi\/varianty(?:\/[^/]+)*|olimpiady\/[^/]+\/[^/]+)\/?$/
const variantRoute = /^\/olimpiady\/[^/]+\/[^/]+\/?$/

function publicUrl(value, base) {
  try {
    const url = new URL(value.replaceAll('&amp;', '&'), base)
    if (url.origin !== origin || url.username || url.password) return null
    url.hash = ''
    return url
  } catch {
    return null
  }
}

function attributes(markup, attributesPattern) {
  const pattern = new RegExp(`\\s(?:${attributesPattern})\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'gi')
  return Array.from(markup.matchAll(pattern), (match) => match[1] ?? match[2] ?? match[3])
}

async function cachedFile(name) {
  try {
    return await readFile(join(output, name))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return null
  }
}

let halt = false
let networkFailure = false
async function download(url, name, expected) {
  const cached = await cachedFile(name)
  if (cached) return cached
  if (halt) throw new Error('Collection paused')
  await delay(200)
  let response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(20000) })
  } catch (error) {
    networkFailure = true
    halt = true
    throw error
  }
  if (response.status === 429 || response.status === 503) halt = true
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  if (!publicUrl(response.url || url, url)) throw new Error('Redirect outside the source site')
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.startsWith(expected) && !(expected === 'image/' && contentType.startsWith('application/octet-stream'))) {
    throw new Error(`Unexpected content type: ${contentType}`)
  }
  const bytes = Buffer.from(await response.arrayBuffer())
  if (!bytes.length) throw new Error('Empty response')
  await writeFile(join(output, name), bytes)
  return bytes
}

const start = publicUrl(seed, catalog)
if (!start || !pageRoute.test(start.pathname)) throw new Error('Use a public Botay catalog or olympiad variant URL')
await mkdir(join(output, 'pages'), { recursive: true })
await mkdir(join(output, 'images'), { recursive: true })

const queue = [start.href]
const queued = new Set(queue)
const manifest = { seed: start.href, pages: {}, images: {}, failures: [], pending: [] }
const key = (url) => createHash('sha256').update(url).digest('hex').slice(0, 24)

async function saveImage(value, pageUrl) {
  const parsed = publicUrl(value, pageUrl)
  if (!parsed) {
    if (value && !value.startsWith('data:')) manifest.failures.push({ url: value, from: pageUrl, error: 'Image outside the source site' })
    return
  }
  const url = parsed.href
  if (manifest.images[url]) return
  const extension = parsed.pathname.match(/\.[a-z0-9]{1,6}$/i)?.[0] ?? ''
  const name = 'images/' + key(url) + extension
  try {
    await download(url, name, 'image/')
    manifest.images[url] = name
  } catch (error) {
    manifest.failures.push({ url, from: pageUrl, error: error.message })
  }
}

for (let index = 0; index < queue.length && !halt; index++) {
  const url = queue[index]
  const name = 'pages/' + key(url) + '.html'
  let html
  try {
    html = (await download(url, name, 'text/html')).toString('utf8')
    manifest.pages[url] = name
  } catch (error) {
    manifest.failures.push({ url, error: error.message })
    continue
  }
  if (variantRoute.test(new URL(url).pathname)) {
    for (const [tag] of html.matchAll(/<(?:img|source)\b[^>]*>/gi)) {
      for (const value of attributes(tag, 'src|data-src|data-original')) {
        await saveImage(value, url)
        if (halt) break
      }
      if (halt) break
      for (const srcset of attributes(tag, 'srcset|data-srcset')) {
        if (srcset.startsWith('data:')) continue
        for (const candidate of srcset.split(',')) {
          await saveImage(candidate.trim().split(/\s+/)[0], url)
          if (halt) break
        }
        if (halt) break
      }
      if (halt) break
    }
    console.log('Saved variant:', new URL(url).pathname)
    continue
  }
  for (const [tag] of html.matchAll(/<a\b[^>]*>/gi)) {
    for (const value of attributes(tag, 'href')) {
      const linked = publicUrl(value, url)
      if (!linked || !pageRoute.test(linked.pathname)) continue
      linked.search = ''
      if (queued.has(linked.href)) continue
      queued.add(linked.href)
      queue.push(linked.href)
    }
  }
}

manifest.pending = queue.filter((url) => !manifest.pages[url])
await writeFile(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
const variants = Object.keys(manifest.pages).filter((url) => variantRoute.test(new URL(url).pathname)).length
console.log(`Variants: ${variants}. Images: ${Object.keys(manifest.images).length}. Errors: ${manifest.failures.length}. Pending pages: ${manifest.pending.length}.`)
if (!variants || halt || manifest.failures.length) {
  if (networkFailure) console.error('The source could not be reached. Rerun the same command from a network where it opens.')
  else console.error('Collection incomplete. See manifest.json and rerun the same command to resume.')
  process.exitCode = 1
}
