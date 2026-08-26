import { useState } from 'react'

/**
 * 어떤 칸을 한 번 벗어났는지 기억한다.
 *
 * 오류를 치는 도중에 띄우면 「2~4」를 적으려고 「2~」까지 친 순간부터 빨개진다. 아직 적는
 * 중인데 틀렸다는 말을 듣는 셈이다. 그래서 한 번 다녀간 칸만 검사해서 보여 준다.
 *
 * **다음 버튼을 잠그는 판단에는 쓰지 않는다.** 그건 다녀갔든 아니든 값이 옳아야 열린다.
 * 여기서 거르는 건 「언제 보여 줄지」 뿐이다.
 */
export function useTouched() {
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set())

  return {
    /** 칸의 onBlur 에 물린다. */
    touch: (key: string) =>
      setTouched((current) => (current.has(key) ? current : new Set(current).add(key))),

    /** 다녀간 적이 있을 때만 오류를 돌려준다. 아니면 null 이라 아무것도 안 그려진다. */
    error: (key: string, error: string | null) => (touched.has(key) ? error : null),
  }
}
