import { Modal, ModalHeading } from './Modal'
import { ctaPrimaryClass } from './form/CtaButton'

/**
 * 비밀번호 재설정 완료 팝업.
 *
 * 재설정 응답은 204 라 세션이 열리지 않는다. 그대로 로그인 화면으로 보내면 성공한 건지
 * 튕긴 건지 알 수 없어서, 가입 완료 팝업(182:6031)과 같은 자리에 한 번 알려 준다.
 *
 * 이 팝업만 시안이 없다. 문구와 버튼은 「이메일 검색 결과」(224:30671)를 따랐다 —
 * 로그인으로 보낸다는 점이 같고 시안 중 가장 최신이다.
 */
export function PasswordResetDoneDialog({
  open,
  onClose,
}: {
  open: boolean
  /** 확인을 누르든 배경을 누르든 갈 곳은 로그인 화면 하나뿐이다. */
  onClose: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} label="비밀번호 재설정 완료" contentWidth="max-w-[377px]">
      <ModalHeading title="비밀번호가 변경되었습니다">
        <p>새 비밀번호로 다시 로그인해 주세요.</p>
      </ModalHeading>

      <button type="button" onClick={onClose} className={`${ctaPrimaryClass} w-full`}>
        로그인하러 가기
      </button>
    </Modal>
  )
}
