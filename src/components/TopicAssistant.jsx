import React, { useEffect, useRef, useState } from 'react'
import { Icon } from './ui.jsx'
import './topicAssistant.css'

const QUICK_QUESTIONS = [
  { label: 'Подсказка', question: 'Дай подсказку, с чего начать' },
  { label: 'Идея', question: 'Объясни основную идею решения' },
  { label: 'По шагам', question: 'Разбери решение по шагам' },
  { label: 'Полный ответ', question: 'Покажи полное решение и ответ' },
]

const DEMO_REPLY = 'Здесь появится разбор с учётом вашего вопроса и условия задачи. Сейчас показан пример ответа.'
const EMPTY_CONVERSATION = { draft: '', exchanges: [] }

export default function TopicAssistant({ open, topicTitle, task, onDismiss }) {
  const dialog = useRef(null)
  const scrollArea = useRef(null)
  const [conversations, setConversations] = useState({})
  const contextKey = task ? `task:${task.id}` : 'topic'
  const { draft, exchanges } = conversations[contextKey] ?? EMPTY_CONVERSATION

  useEffect(() => {
    const panel = dialog.current
    if (open && !panel.open) panel.showModal()
    if (!open && panel.open) panel.close()
  }, [open])

  useEffect(() => {
    if (open) scrollArea.current.scrollTop = exchanges.length ? scrollArea.current.scrollHeight : 0
  }, [contextKey, exchanges.length, open])

  function changeDraft(draft) {
    setConversations((current) => ({
      ...current,
      [contextKey]: { ...(current[contextKey] ?? EMPTY_CONVERSATION), draft },
    }))
  }

  function ask(question, clearDraft = false) {
    if (!question.trim()) return
    setConversations((current) => {
      const conversation = current[contextKey] ?? EMPTY_CONVERSATION
      return {
        ...current,
        [contextKey]: {
          draft: clearDraft ? '' : conversation.draft,
          exchanges: [...conversation.exchanges, { question: question.trim(), answer: DEMO_REPLY }],
        },
      }
    })
  }

  return (
    <dialog
      ref={dialog}
      id="topic-assistant"
      className="topic-assistant fixed inset-0 m-0 ml-auto h-[100dvh] max-h-none w-full max-w-none overflow-hidden border-0 bg-white p-0 text-ink-900 sm:w-[32rem] sm:border-l sm:border-line"
      aria-labelledby="topic-assistant-title"
      onCancel={(event) => {
        event.preventDefault()
        onDismiss()
      }}
      onClick={(event) => { if (event.target === event.currentTarget) onDismiss() }}
    >
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto]">
        <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-pen-700">Помощник по задачам</p>
            <h2 id="topic-assistant-title" className="mt-1 break-words font-serif text-2xl font-medium leading-tight sm:text-[28px]">{topicTitle}</h2>
          </div>
          <button type="button" autoFocus aria-label="Закрыть разбор" onClick={onDismiss}
            className="btn-ghost h-11 w-11 shrink-0 p-0">
            <Icon name="close" className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </button>
        </header>

        <div ref={scrollArea} className="overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          {task && (
            <details open className="rounded-lg border border-line border-l-2 border-l-mark-400 bg-paper px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-pen-700 focus-visible:outline-pen-500">Условие задачи</summary>
              <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink-700">{task.text}</p>
            </details>
          )}

          {exchanges.length === 0 && (
            <p className={`${task ? 'mt-6' : ''} text-[15px] leading-relaxed text-ink-500`}>
              {task ? 'Где вы остановились? Можно описать свою попытку или выбрать вид помощи ниже.'
                : 'Напишите вопрос по теме. Чтобы добавить условие задачи, откройте помощника из её карточки.'}
            </p>
          )}
          <div role="log" aria-label="Переписка" className={exchanges.length ? 'mt-5 space-y-5' : ''}>
            {exchanges.map(({ question, answer }, index) => (
              <div key={index} className="space-y-4">
                <div className="border-l border-line pl-3">
                  <p className="text-sm font-semibold text-ink-500">Вы</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{question}</p>
                </div>
                <div className="rounded-lg bg-paper p-4">
                  <p className="text-sm font-semibold text-pen-700">Демо-ответ</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form className="topic-assistant-form space-y-3 border-t border-line px-4 pt-4 sm:px-6"
          onSubmit={(event) => {
            event.preventDefault()
            ask(draft, true)
          }}>
          <div role="group" aria-label="Варианты разбора" className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map(({ label, question }) => (
              <button key={label} type="button" onClick={() => ask(question)}
                className="btn-secondary min-h-10 px-3 py-1 text-sm font-medium">
                {label}
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="topic-assistant-question" className="block text-sm font-semibold text-ink-700">Ваш вопрос</label>
            <textarea id="topic-assistant-question" rows={2} maxLength={2000} value={draft} onChange={(event) => changeDraft(event.target.value)}
              className="mt-2 block max-h-32 w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-base leading-relaxed text-ink-900 outline-none focus:border-pen-500 focus:ring-1 focus:ring-pen-500" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-500">Ответы в демо-режиме</p>
            <button type="submit" disabled={!draft.trim()} className="btn-primary min-h-11 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50">
              Отправить
              <Icon name="arrow" className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
