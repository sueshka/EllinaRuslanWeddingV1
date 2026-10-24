import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ATTEND_OPTIONS, type RsvpForm, type Status } from './rsvp'

interface PanelProps {
  form: RsvpForm
  status: Status
  onChange(form: RsvpForm): void
  onSubmit(): void
  /** dark — «Вечер при свечах» */
  variant?: 'light' | 'dark'
  /** After a successful answer show «Спасибо, {имя}!» instead of the form */
  thanks?: boolean
  header?: ReactNode
  className?: string
}

/** The answer form itself — used inside the bottom sheet or placed directly on a page. */
export function RsvpPanel({ form, status, onChange, onSubmit, variant = 'light', thanks = false, header, className }: PanelProps) {
  const [nameError, setNameError] = useState(false)
  const [editing, setEditing] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const sending = status === 'sending'
  const showThanks = thanks && status === 'success' && !editing
  const choice = ATTEND_OPTIONS.find(([v]) => v === form.attend)?.[1].toLowerCase()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (sending) return
    if (!form.name.trim()) {
      setNameError(true)
      nameRef.current?.focus()
      return
    }
    setEditing(false)
    onSubmit()
  }

  return (
    <form className={[className, variant === 'dark' && 'sheet-dark'].filter(Boolean).join(' ')} onSubmit={submit} noValidate>
      {header}

      {showThanks ? (
        <div className="sheet-thanks" role="status">
          <div className="sheet-thanks-title">Спасибо, {form.name.trim()}!</div>
          <p>
            Ответ сохранён: {choice}.
            <br />
            Изменить его можно по этой же ссылке.
          </p>
          <button type="button" className="sheet-edit" onClick={() => setEditing(true)}>
            ИЗМЕНИТЬ ОТВЕТ
          </button>
        </div>
      ) : (
        <>
          <label className="field">
            Ваше имя или имена
            <input
              ref={nameRef}
              value={form.name}
              onChange={(e) => {
                onChange({ ...form, name: e.target.value })
                if (e.target.value.trim()) setNameError(false)
              }}
              placeholder="Например, Мария и Андрей"
              autoComplete="name"
              aria-invalid={nameError}
              className={nameError ? 'invalid' : undefined}
            />
            {nameError && <span className="field-error">Напишите, пожалуйста, имя — чтобы мы знали, кого ждать.</span>}
          </label>

          <fieldset className="options">
            <legend>На что придёте</legend>
            {ATTEND_OPTIONS.map(([value, label]) => (
              <label key={value} className={'option' + (form.attend === value ? ' selected' : '')}>
                <input
                  type="radio"
                  name="attend"
                  value={value}
                  checked={form.attend === value}
                  onChange={() => onChange({ ...form, attend: value })}
                />
                <span className="radio" aria-hidden>
                  <span />
                </span>
                {label}
              </label>
            ))}
          </fieldset>

          {status === 'error' && (
            <div className="sheet-error" role="alert">
              Ответ не сохранился — нет связи. Всё введённое на месте. Попробуйте ещё раз
              {variant === 'dark' && ' или напишите Эллине.'}
            </div>
          )}

          <button type="submit" className="submit" disabled={sending}>
            {sending ? (
              <>
                <span className="spinner" aria-hidden /> СОХРАНЯЕМ…
              </>
            ) : status === 'error' ? (
              'ОТПРАВИТЬ ЕЩЁ РАЗ'
            ) : (
              'ОТПРАВИТЬ ОТВЕТ'
            )}
          </button>
          <div className="sheet-note">Ответ увидят только Руслан и Эллина</div>
        </>
      )}
    </form>
  )
}

interface SheetProps extends Omit<PanelProps, 'header' | 'className'> {
  onClose(): void
}

export default function RsvpSheet({ onClose, ...panel }: SheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="sheet-title" className="sheet-host" onClick={(e) => e.stopPropagation()}>
        <RsvpPanel
          {...panel}
          className="sheet"
          header={
            <div className="sheet-head">
              <h2 id="sheet-title">Будете рядом?</h2>
              <button type="button" className="sheet-close" onClick={onClose} aria-label="Закрыть">
                ✕
              </button>
            </div>
          }
        />
      </div>
    </div>
  )
}
