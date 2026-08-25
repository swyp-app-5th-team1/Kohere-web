import type { InputHTMLAttributes } from 'react'
import { inputClass, inputErrorClass } from './Field'
import clearUrl from '../../assets/icon-x-small.svg'

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** 값이 잘못됐을 때. 테두리와 배경이 오류 색으로 바뀐다. */
  error?: boolean
  /**
   * 넘기면 값이 있을 때 오른쪽에 지우기 버튼이 생긴다(시안 224:30202 · 224:30207).
   * 인증번호처럼 시안에 지우기가 없는 칸에는 넘기지 않는다.
   */
  onClear?: () => void
  /** 지우기 버튼이 있을 때만 쓰는 바깥 상자용 클래스. 너비 · flex 같은 배치를 여기 준다. */
  wrapperClassName?: string
}

/**
 * 디자인 시스템 「입력 필드 Input Field」를 그대로 옮긴 입력창.
 *
 * hover · 포커스 · 값 채워짐 · 비활성은 CSS 로 처리되고, 오류만 밖에서 알려줘야 한다.
 * 화면마다 다른 글자 굵기는 className 으로 붙인다.
 */
export function TextField({
  error = false,
  className = '',
  onClear,
  wrapperClassName = '',
  ...rest
}: TextFieldProps) {
  const shape = (error ? inputErrorClass : inputClass) + (className ? ' ' + className : '')

  // 지우기가 없으면 예전 그대로 input 하나만 그린다. 바깥 상자가 생기면 배치가 달라져서다.
  if (!onClear) {
    return <input {...rest} type="text" aria-invalid={error || undefined} className={shape} />
  }

  return (
    <div className={'relative w-full ' + wrapperClassName}>
      <input
        {...rest}
        type="text"
        aria-invalid={error || undefined}
        // 버튼 자리를 비워 둔다. 16px 아이콘 + 좌우 여백.
        className={shape + ' pr-11'}
      />
      {/* 값이 있을 때만 보인다. 시안도 비어 있는 칸에는 지우기가 없다. */}
      {rest.value !== undefined && rest.value !== '' && (
        <button
          type="button"
          aria-label="입력 지우기"
          onClick={onClear}
          className="absolute top-1/2 right-4 flex size-4 -translate-y-1/2 items-center justify-center"
        >
          <img src={clearUrl} alt="" className="size-full" />
        </button>
      )}
    </div>
  )
}
