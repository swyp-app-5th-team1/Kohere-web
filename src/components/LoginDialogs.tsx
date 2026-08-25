import { useState } from 'react'
import { Modal, ModalHeading } from './Modal'
import { inputClass } from './form/Field'

/*
 * 시안에는 "로그인 8회 실패", "10회 실패하여 계정이 잠겼습니다" 처럼 횟수가 적혀 있다.
 * 그런데 서버가 남은 시도 횟수를 응답에 내려주지 않고, 잠금 기준도 5회에서 10회로
 * 바꾸기로 한 상태라 아직 확정이 아니다. 그래서 숫자를 빼고 문구만 남겼다.
 * 서버가 횟수를 내려주기 시작하면 이 두 파일의 문구만 고치면 된다.
 */

const confirmButtonClass =
  'border-line-normal bg-label-normal flex h-12 w-full items-center justify-center rounded-2xl ' +
  'border px-3 text-base leading-6 font-semibold text-white transition hover:brightness-125'

/** 401 AUTH_INVALID_CREDENTIALS — 이메일이 없거나 비밀번호가 틀렸을 때. */
export function LoginFailedDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} label="로그인 실패">
      <ModalHeading title="로그인 실패">
        <p>여러 번 실패하면 계정이 잠금 상태로 설정되고</p>
        <p>이메일을 통해 비밀번호를 재설정해야 합니다.</p>
      </ModalHeading>

      <button type="button" onClick={onClose} className={confirmButtonClass}>
        확인
      </button>
    </Modal>
  )
}

type AccountLockedDialogProps = {
  open: boolean
  onClose: () => void
  /** 로그인 화면에서 입력했던 이메일. 다시 치지 않도록 채워 준다. */
  defaultEmail?: string
}

/** 423 AUTH_ACCOUNT_LOCKED — 연속 실패로 잠긴 계정. 운영자만 풀 수 있어 재설정으로 안내한다. */
export function AccountLockedDialog({
  open,
  onClose,
  defaultEmail = '',
}: AccountLockedDialogProps) {
  const [email, setEmail] = useState(defaultEmail)

  return (
    <Modal open={open} onClose={onClose} label="비밀번호 재설정">
      <div className="flex w-full flex-col items-center gap-4 text-center">
        <ModalHeading title="비밀번호 재설정">
          <p>로그인에 여러 번 실패하여 계정이 잠겼습니다.</p>
          <p>이메일로 비밀번호 재설정 링크가 발송됩니다.</p>
        </ModalHeading>

        <input
          type="email"
          aria-label="이메일"
          placeholder="이메일"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={`${inputClass} font-medium`}
        />
      </div>

      {/*
       * TODO(API 나오면 연결): 비밀번호 재설정 링크 발송. 서버에 아직 경로가 없어서
       * 누를 수 없게 두었다. 시안도 비활성(회색) 상태로 그려져 있다.
       */}
      <button
        type="button"
        disabled
        className="border-line-alternative bg-cool-neutral-20 flex h-12 w-full cursor-not-allowed items-center justify-center rounded-2xl border px-3 text-base leading-6 font-semibold text-white"
      >
        인증번호 발송
      </button>
    </Modal>
  )
}
