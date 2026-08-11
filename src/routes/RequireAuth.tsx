import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { loadTokens } from '../api/tokens'

/**
 * 로그인이 필요한 경로를 감싼다. 토큰이 없으면 로그인 화면으로 보내고,
 * 원래 가려던 주소를 state 에 담아 로그인 후 되돌려 보낼 수 있게 한다.
 *
 * 이건 UX 용 가드지 보안 장치가 아니다. 자바스크립트 번들은 브라우저에 통째로
 * 내려가 있어서 화면 자체는 열릴 수 있다. 실제 접근 통제는 서버가 한다.
 */
export function RequireAuth() {
  const location = useLocation()

  if (loadTokens() === null) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
