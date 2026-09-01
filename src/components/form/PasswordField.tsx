import { useState, type InputHTMLAttributes } from 'react'
import { inputClass, inputErrorClass } from './Field'
import eyeHiddenUrl from '../../assets/icon-eye-hidden.png'

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** 값이 잘못됐을 때. 테두리와 배경이 오류 색으로 바뀐다. */
  error?: boolean
}

/**
 * 눈 아이콘이 달린 비밀번호 칸 (시안 224:30759).
 *
 * 아이콘은 오른쪽 끝에서 4px 떨어진 40x32 상자 안의 20px 그림이다. 시안에 감은 눈
 * 하나만 있어서, 보이는 동안은 흐리게 해 상태를 구분한다. 뜬 눈을 받으면 여기만 고친다.
 *
 * 로그인 화면은 시안(224:30111)이 아이콘 자리를 달리 잡아 두어 아직 자체 마크업을 쓴다.
 * 두 시안이 같아지면 그쪽도 이 컴포넌트로 합친다.
 */
export function PasswordField({ error = false, className = '', ...rest }: PasswordFieldProps) {
  const [shown, setShown] = useState(false)

  const shape =
    (error ? inputErrorClass : inputClass) +
    // 아이콘 상자(40) 자리를 비워 둔다.
    ' pr-11' +
    (className ? ' ' + className : '')

  return (
    <div className="relative w-full">
      <input
        {...rest}
        type={shown ? 'text' : 'password'}
        aria-invalid={error || undefined}
        className={shape}
      />
      <button
        type="button"
        onClick={() => setShown((current) => !current)}
        aria-label={shown ? '비밀번호 숨기기' : '비밀번호 표시'}
        aria-pressed={shown}
        className="absolute top-1/2 right-1 flex h-8 -translate-y-1/2 items-center p-2.5"
      >
        <img src={eyeHiddenUrl} alt="" className={'size-5 ' + (shown ? 'opacity-40' : '')} />
      </button>
    </div>
  )
}
