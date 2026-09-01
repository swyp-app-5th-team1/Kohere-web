import { Modal } from './Modal'

type SignupCompleteDialogProps = {
  open: boolean
  /** 확인을 누르든 배경을 누르든 갈 곳은 로그인 화면 하나뿐이다. */
  onClose: () => void
}

/**
 * 가입 성공 팝업. 가입 응답에 토큰이 오지만 자동 로그인을 시키지 않고
 * 로그인 화면으로 보낸다 (시안 182:6031).
 */
export function SignupCompleteDialog({ open, onClose }: SignupCompleteDialogProps) {
  return (
    <Modal open={open} onClose={onClose} label="가입 완료">
      <h2 className="text-cool-neutral-50 w-full text-center text-2xl leading-[1.6] font-bold">
        코히어 가입이 완료되었습니다
        <br />
        로그인 후 서비스를 이용해주세요
      </h2>

      <button
        type="button"
        onClick={onClose}
        className="border-line-alternative bg-primary-40 flex h-12 w-full items-center justify-center rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition hover:brightness-105"
      >
        로그인하러 가기
      </button>
    </Modal>
  )
}
