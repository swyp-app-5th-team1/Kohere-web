import { useEffect, useState } from 'react'

const secondsLeft = (deadline: number | null) =>
  deadline === null ? 0 : Math.max(0, Math.ceil((deadline - Date.now()) / 1000))

/**
 * 마감 시각(epoch ms)까지 남은 초. `null` 이면 0 을 돌려준다.
 *
 * 남은 초를 1씩 빼지 않고 **매번 Date.now() 로 다시 계산한다.** 탭이 백그라운드로 가면
 * 브라우저가 setInterval 을 늦추거나 아예 멈춰서, 횟수로 세면 돌아왔을 때 실제보다
 * 시간이 남은 것처럼 보인다. setInterval 은 다시 그릴 시점만 정한다.
 *
 * 이 값은 안내용이고 만료 판정은 서버가 한다. 0 이 되어도 "만료됐다" 로 단정하지 않는다.
 */
export function useCountdown(deadline: number | null): number {
  const [remaining, setRemaining] = useState(() => secondsLeft(deadline))

  useEffect(() => {
    setRemaining(secondsLeft(deadline))
    if (deadline === null) return

    const id = setInterval(() => setRemaining(secondsLeft(deadline)), 1000)
    return () => clearInterval(id)
  }, [deadline])

  return remaining
}

/** 초를 m:ss 로. 인증번호 남은 시간 표시에 쓴다. */
export function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
