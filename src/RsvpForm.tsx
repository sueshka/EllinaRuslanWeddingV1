import { useRef, useState } from 'react'
import { ATTEND_OPTIONS, type RsvpForm as Form, type Status } from './rsvp'

interface Props {
  form: Form
  status: Status
  onChange(form: Form): void
  onSubmit(): void
}

/** The answer form on the last page; after a successful answer shows «Спасибо, {имя}!». */
export default function RsvpForm({ form, status, onChange, onSubmit }: Props) {
  const [nameError, setNameError] = useState(false)
  const [editing, setEditing] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const sending = status === 'sending'
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

  if (status === 'success' && !editing) {
    return (
      <div className="rsvp rsvp-thanks" role="status">
        <div className="rsvp-thanks-title">Спасибо, {form.name.trim()}!</div>
        <p>
          Ответ сохранён: {choice}.
          <br />
          Изменить его можно по этой же ссылке.
        </p>
        <button type="button" className="rsvp-edit" onClick={() => setEditing(true)}>
          ИЗМЕНИТЬ ОТВЕТ
        </button>
      </div>
    )
  }

  return (
    <form className="rsvp" onSubmit={submit} noValidate>
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
        <div className="rsvp-error" role="alert">
          Ответ не сохранился — нет связи. Всё введённое на месте. Попробуйте ещё раз или напишите Эллине.
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
      <div className="rsvp-note">Ответ увидят только Руслан и Эллина</div>
    </form>
  )
}
