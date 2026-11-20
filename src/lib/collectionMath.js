import renderMathInElement from 'katex/contrib/auto-render'

const DELIMITERS = [
  { left: '\\[', right: '\\]', display: true },
  { left: '\\(', right: '\\)', display: false },
]

// Обозначения из исходных страниц Калды. Макросы не берём из HTML главы.
const VECTORS = {
  F: 'F', v: 'v', a: 'a', r: 'r', p: 'p', L: 'L', P: 'P', T: 'T', g: 'g',
  om: '\\omega', Om: '\\Omega', u: 'u', N: 'N', B: 'B', E: 'E',
}
const MACROS = {
  ...Object.fromEntries(Object.entries(VECTORS).map(([key, symbol]) => ['\\v' + key, '\\vec{' + symbol + '}'])),
  '\\thyp': '\\operatorname{th}',
  '\\cthyp': '\\operatorname{cth}',
  '\\emf': '\\mathcal{E}',
  '\\re': '\\operatorname{Re}',
  '\\im': '\\operatorname{Im}',
  '\\Om': '\\,\\Omega',
  '\\Const': '\\mathrm{const}',
  '\\qed': '\\square',
}

export function prepareCollectionTex(tex) {
  return tex
    .replaceAll('\\varφ', '\\varphi')
    .replace(/_\s*(\\(?:min|max))(?![a-zA-Z])/g, '_{$1}')
    // В соседнем абзаце исходника эта же цепочка записана без лишнего индекса.
    .replaceAll("\\nu_\\>\\nu_\\perp>\\nu'", "\\nu>\\nu_\\perp>\\nu'")
}

export function collectionMathOptions() {
  return {
    delimiters: DELIMITERS,
    macros: { ...MACROS },
    preProcess: prepareCollectionTex,
    throwOnError: true,
    strict: 'ignore',
    trust: false,
  }
}

export function expandTaskLabels(text) {
  return text.replace(
    /(?<![\p{L}\p{M}\p{N}])зад(?:\.(?![\p{L}\p{M}])|(?=\s*(?:\d|$)))/giu,
    (label) => label.startsWith('З') ? 'Задача' : 'задача',
  )
}

export function formatCollectionText(element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode
    const text = expandTaskLabels(node.data)
    if (text !== node.data) node.data = text
  }
  renderMathInElement(element, collectionMathOptions())
}

// Measure the formula itself, rather than its ink overflow from tall glyphs.
// Observing both boxes also covers narrow screens, font loading and opened solutions.
export function fitCollectionFormulas(element) {
  const boxes = [...element.querySelectorAll('.math-overflow')]
    .filter((box) => box.firstElementChild)
  function update(box) {
    const width = box.getBoundingClientRect().width
    const formulaWidth = box.firstElementChild.getBoundingClientRect().width
    box.classList.toggle('is-wide', width > 0 && formulaWidth > width + 2)
  }
  const observer = new ResizeObserver((entries) => {
    for (const { target } of entries) {
      update(target.classList.contains('math-overflow') ? target : target.parentElement)
    }
  })
  for (const box of boxes) {
    update(box)
    observer.observe(box)
    observer.observe(box.firstElementChild)
  }
  return () => observer.disconnect()
}

export function searchSnippet(text) {
  if (text.length < 220) return text
  // Сервер присылает первые 220 символов. Убираем хвост, если он оборвался посреди формулы.
  const inline = text.lastIndexOf('\\(') > text.lastIndexOf('\\)') ? text.lastIndexOf('\\(') : -1
  const display = text.lastIndexOf('\\[') > text.lastIndexOf('\\]') ? text.lastIndexOf('\\[') : -1
  const cut = Math.max(inline, display)
  return (cut === -1 ? text : text.slice(0, cut)).trimEnd() + '…'
}
