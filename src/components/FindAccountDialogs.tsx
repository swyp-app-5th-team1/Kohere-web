import { useNavigate } from 'react-router-dom'
import { Modal, ModalHeading } from './Modal'
import { ctaPrimaryClass, ctaSecondaryClass } from './form/CtaButton'

/*
 * 이메일 찾기 결과 팝업 두 개 (시안 224:30671 · 224:30680).
 *
 * 제목은 찾았을 때와 못 찾았을 때가 「이메일 검색 결과」로 같다. 달라지는 건 본문 한 줄과
 * 아래 버튼뿐이라 껍데기를 함께 쓴다. 내용 기둥은 377px 이다.
 */

/** 찾았을 때. 가려진 주소를 보여주고 로그인으로 보낸다. */
export function EmailFoundDialog({
  open,
  onClose,
  maskedEmail,
}: {
  open: boolean
  onClose: () => void
  /** 서버가 가려서 내려준 주소. 화면에서 가리지 않는다 — 가리는 의미가 없어서다. */
  maskedEmail: string
}) {
  const navigate = useNavigate()

  return (
    <Modal open={open} onClose={onClose} label="이메일 검색 결과" contentWidth="max-w-[377px]">
      <ModalHeading title="이메일 검색 결과">
        <p>{maskedEmail}</p>
      </ModalHeading>

      <button
        type="button"
        onClick={() => navigate('/login')}
        className={`${ctaPrimaryClass} w-full`}
      >
        로그인하러 가기
      </button>
    </Modal>
  )
}

/**
 * 못 찾았을 때.
 *
 * 이 팝업이 「그런 계정은 없다」를 알려주는 건 맞는데, 그래도 되는 이유가 있다. 여기까지
 * 오려면 그 전화번호로 문자 인증을 통과해야 해서 남의 번호로는 띄울 수 없다. 로그인이나
 * 재설정 링크 발송처럼 아무나 부를 수 있는 경로와는 사정이 다르다.
 */
export function EmailNotFoundDialog({
  open,
  onClose,
}: {
  open: boolean
  /** 「다시 찾기」와 배경 · ESC 가 모두 이걸 부른다. 폼으로 돌아가는 게 전부라서다. */
  onClose: () => void
}) {
  const navigate = useNavigate()

  return (
    <Modal open={open} onClose={onClose} label="이메일 검색 결과" contentWidth="max-w-[377px]">
      <ModalHeading title="이메일 검색 결과">
        <p>조회 결과가 없습니다.</p>
      </ModalHeading>

      {/* 시안의 두 버튼은 폭이 같고 사이가 20px 다. */}
      <div className="flex w-full items-start justify-center gap-5">
        <button type="button" onClick={onClose} className={`${ctaSecondaryClass} flex-1`}>
          다시 찾기
        </button>
        <button
          type="button"
          onClick={() => navigate('/signup')}
          className={`${ctaPrimaryClass} flex-1`}
        >
          회원가입
        </button>
      </div>
    </Modal>
  )
}
