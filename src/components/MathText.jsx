import React from 'react'

// Лёгкая разметка формул в текстах задач (см. backend/scripts/problems_*.py):
//   x_A, x_{AB} — нижний индекс;  10^{-6}, α^2 — верхний.
// Без KaTeX: для школьных условий этого достаточно, а текст остаётся текстом (поиск, копирование).
const TOKEN = /([_^])(\{[^}]*\}|[^\s{}.,;:!?)])/g

export default function MathText({ text, className = '' }) {
  const parts = []
  let last = 0
  let m
  TOKEN.lastIndex = 0
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const body = m[2].startsWith('{') ? m[2].slice(1, -1) : m[2]
    const Tag = m[1] === '_' ? 'sub' : 'sup'
    parts.push(
      <Tag key={m.index} className="text-[0.78em] leading-none">
        {body.replace(/-/g, '−')}
      </Tag>
    )
    last = TOKEN.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return <span className={className}>{parts}</span>
}
