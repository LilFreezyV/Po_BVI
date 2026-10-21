import React, { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'

/* Общие кирпичики моушен-дизайна лендинга.
   Правило: любая анимация выключается при системной настройке «уменьшить движение» —
   иначе сайт становится непригодным для тех, кому от анимаций плохо. */

export const EASE = [0.16, 1, 0.3, 1] // мягкое замедление, без «пружинистого» отскока

/** Появление блока при прокрутке: один раз, снизу вверх. */
export function Reveal({ children, delay = 0, y = 18, className = '', as = 'div' }) {
  const reduce = useReducedMotion()
  const Tag = motion[as] || motion.div
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: EASE, delay }}
    >
      {children}
    </Tag>
  )
}

/** Список, элементы которого появляются по очереди. */
export function Stagger({ children, step = 0.08, className = '', as = 'div' }) {
  const reduce = useReducedMotion()
  const Tag = motion[as] || motion.div
  return (
    <Tag
      className={className}
      initial={reduce ? false : 'hidden'}
      whileInView={reduce ? {} : 'show'}
      viewport={{ once: true, margin: '-60px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: step } } }}
    >
      {children}
    </Tag>
  )
}

export const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

/** Число, которое «набирается» при появлении в кадре. */
export function CountUp({ value, duration = 1.1, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(0)
  const target = Number(value) || 0

  useEffect(() => {
    if (!inView) return
    if (reduce) {
      setShown(target)
      return
    }
    const controls = animate(0, target, {
      duration,
      ease: EASE,
      onUpdate: (v) => setShown(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, target, duration, reduce])

  return (
    <span ref={ref} className={className}>
      {shown}
    </span>
  )
}

/** Линия, которая рисуется по мере прокрутки секции (как проведённая ручкой). */
export function ScrollLine({ targetRef, className = '' }) {
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: targetRef, offset: ['start 70%', 'end 60%'] })
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 })
  return (
    <motion.div
      aria-hidden="true"
      className={className}
      style={{ scaleY: reduce ? 1 : scaleY, transformOrigin: 'top' }}
    />
  )
}

/** Рукописное подчёркивание, которое прочерчивается после появления текста. */
export function DrawnUnderline({ children, delay = 0.5, color = '#B23A2A' }) {
  const reduce = useReducedMotion()
  return (
    <span className="relative whitespace-nowrap">
      <span className="relative z-10">{children}</span>
      <svg
        className="absolute -bottom-1 left-0 h-3 w-full"
        viewBox="0 0 120 12"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <motion.path
          d="M2 8.5C22 4.5 44 3.2 68 4.4C86 5.3 104 7 118 5.2"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay }}
        />
      </svg>
    </span>
  )
}

/** Параллакс по прокрутке: медленный сдвиг фоновых слоёв. */
export function useParallax(ref, distance = 60) {
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, distance])
  return reduce ? 0 : y
}
