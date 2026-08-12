import { useEffect, useRef, type InputHTMLAttributes } from 'react'

type FormattedInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  value: string
  onChange: (next: string) => void
  /** 입력할 때마다 값을 다듬는다. formatters.ts 참고. */
  format: (raw: string) => string
}

/** 몇 번째 숫자 뒤인지로 커서 자리를 찾는다. 하이픈이 끼어들어도 자리를 안 잃는다. */
const positionAfterDigits = (text: string, count: number) => {
  if (count === 0) return 0

  let seen = 0
  for (let index = 0; index < text.length; index += 1) {
    if (/\d/.test(text[index])) {
      seen += 1
      if (seen === count) return index + 1
    }
  }
  return text.length
}

/**
 * 입력하는 동안 하이픈을 넣어 주는 입력창.
 *
 * 그냥 다시 그리면 커서가 맨 뒤로 튀어서, 가운데를 고칠 때 쓸 수가 없다.
 * 그래서 커서 앞의 숫자 개수를 세어 두었다가 다듬은 값에서 같은 자리로 되돌린다.
 */
export function FormattedInput({ value, onChange, format, ...rest }: FormattedInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const caretRef = useRef<number | null>(null)

  useEffect(() => {
    if (caretRef.current === null || inputRef.current === null) return
    inputRef.current.setSelectionRange(caretRef.current, caretRef.current)
    caretRef.current = null
  })

  return (
    <input
      {...rest}
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(event) => {
        const input = event.target
        const caret = input.selectionStart ?? input.value.length
        const digitsBeforeCaret = (input.value.slice(0, caret).match(/\d/g) ?? []).length
        const next = format(input.value)

        caretRef.current = positionAfterDigits(next, digitsBeforeCaret)

        // 숫자가 아닌 글자를 쳤을 때는 값이 그대로라 다시 그려지지 않는다. 직접 되돌린다.
        if (next === value && input.value !== next) input.value = next

        onChange(next)
      }}
    />
  )
}
