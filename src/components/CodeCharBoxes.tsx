import { useRef } from 'react'

const N = 4

function toFourSlots(value: string): string[] {
  const cleaned = value.replace(/\s/g, '').slice(0, N)
  return [0, 1, 2, 3].map((i) => (cleaned[i] ?? '').toUpperCase())
}

/** One character per box; paste fills left to right. */
export function CodeCharBoxesEdit({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const slots = toFourSlots(value)

  function applySlots(nextSlots: string[]) {
    onChange(nextSlots.join('').slice(0, N))
  }

  return (
    <div className="code-char-boxes code-char-boxes--edit" role="group" aria-label="4-character gift code">
      {slots.map((ch, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          className="code-char-box code-char-box--input"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={1}
          value={ch}
          disabled={disabled}
          aria-label={`Character ${i + 1} of 4`}
          onChange={(e) => {
            const raw = e.target.value
            const nextChar = raw.slice(-1).toUpperCase()
            const next = [...slots]
            next[i] = nextChar.length === 1 ? nextChar : ''
            applySlots(next)
            if (nextChar && i < N - 1) {
              refs.current[i + 1]?.focus()
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault()
              if (slots[i]) {
                const next = [...slots]
                next[i] = ''
                applySlots(next)
              } else if (i > 0) {
                const next = [...slots]
                next[i - 1] = ''
                applySlots(next)
                refs.current[i - 1]?.focus()
              }
            } else if (e.key === 'ArrowLeft' && i > 0) {
              e.preventDefault()
              refs.current[i - 1]?.focus()
            } else if (e.key === 'ArrowRight' && i < N - 1) {
              e.preventDefault()
              refs.current[i + 1]?.focus()
            }
          }}
          onFocus={(e) => e.currentTarget.select()}
          onPaste={(e) => {
            e.preventDefault()
            const text = e.clipboardData
              .getData('text')
              .replace(/\s/g, '')
              .toUpperCase()
              .slice(0, N)
            onChange(text)
            const focusIdx = Math.min(Math.max(0, text.length - 1), N - 1)
            queueMicrotask(() => refs.current[focusIdx]?.focus())
          }}
        />
      ))}
    </div>
  )
}

/** Read-only four boxes (list, modal). */
export function CodeCharBoxesReadonly({
  code,
  size = 'md',
}: {
  code: string
  size?: 'md' | 'lg'
}) {
  const compact = code.toUpperCase().replace(/\s/g, '').slice(0, N)
  const slots = [0, 1, 2, 3].map((i) => compact[i] ?? '')
  const label = `Gift code ${compact}`

  return (
    <div
      className={`code-char-boxes code-char-boxes--readonly${size === 'lg' ? ' code-char-boxes--lg' : ''}`}
      role="group"
      aria-label={label}
    >
      {slots.map((ch, i) => (
        <span key={i} className="code-char-box code-char-box--readonly-cell">
          {ch ? ch : '\u00a0'}
        </span>
      ))}
    </div>
  )
}
