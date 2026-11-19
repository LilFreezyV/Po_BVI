import React from 'react'

const captions = {
  slope: 'Траектория мяча и профиль склона',
  wedge: 'Изменение модуля скорости относительно значения при ударе',
  heater: 'Эквивалентная схема нагревателя',
}

export default function ArchiveTaskFigure({ kind }) {
  return <figure className="my-4 max-w-lg rounded-lg border border-line bg-white p-3">
    <svg viewBox="0 0 400 220" role="img" aria-label={captions[kind]} className="block w-full">
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        {kind === 'slope' && <>
          <path d="M40 185H375M40 185V18M40 185L246.7 30" />
          <path d="M40 185Q113.33 75 186.67 75M186.67 75h44l-8-4m8 4-8 4" stroke="#2467a0" strokeWidth="3" />
          <path d="M186.67 75V185M40 75H186.67" strokeDasharray="4 4" opacity=".55" />
        </>}
        {kind === 'wedge' && <>
          <path d="M48 195H374M48 195V29" />
          <path d="M48 116H374M160 80V195M48 140H85M48 188H328M328 188V195" strokeDasharray="4 4" opacity=".55" />
          <path d="M48 140L160 116L328 188" stroke="#2467a0" strokeWidth="3" />
        </>}
        {kind === 'heater' && <>
          <path d="M30 110H85V58H142L150 49L163 67L176 49L189 67L202 49L215 67L228 49L236 58H315V110H370" />
          <path d="M85 110V160H142L150 151L163 169L176 151L189 169L202 151L215 169L228 151L236 160H315V110" />
          <circle cx="85" cy="110" r="3" fill="currentColor" /><circle cx="315" cy="110" r="3" fill="currentColor" />
        </>}
      </g>
      <g fill="currentColor" fontSize="13" fontFamily="system-ui, sans-serif">
        {kind === 'slope' && <><text x="353" y="205">x</text><text x="22" y="25">y</text>
          <text x="22" y="79">H</text><text x="70" y="177">β</text><text x="190" y="62">удар</text></>}
        {kind === 'wedge' && <><text x="48" y="22">v − v(0,2 с), м/с</text>
          <text x="30" y="121">0</text><text x="20" y="146">−0,4</text><text x="12" y="192">−1,2</text>
          <text x="44" y="211">0</text><text x="149" y="211">0,2</text><text x="315" y="211">0,5</text><text x="366" y="211">t, с</text></>}
        {kind === 'heater' && <><text x="20" y="100">A</text><text x="367" y="100">B</text>
          <text x="180" y="36">Rₓ</text><text x="170" y="197">R − Rₓ</text></>}
      </g>
    </svg>
    <figcaption className="mt-2 text-sm">{captions[kind]}</figcaption>
  </figure>
}
