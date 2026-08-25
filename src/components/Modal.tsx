import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type ModalProps = {
  open: boolean
  onClose: () => void
  /** 스크린 리더가 읽을 제목. 화면에 보이는 제목과 같은 문구를 넣는다. */
  label: string
  /**
   * 안쪽 내용 기둥의 최대 너비.
   *
   * 카드는 어느 팝업이나 577px 인데 내용 너비는 시안마다 다르다. 「이메일 검색 결과」
   * (224:30671)는 377, 「비밀번호 재설정」(224:30728)은 425 다. 그래서 카드는 고정해
   * 두고 이 값만 바꾼다.
   */
  contentWidth?: string
  children: ReactNode
}

/**
 * 화면 가운데 뜨는 팝업. 시안의 카드(너비 577 · 모서리 24 · 위아래 56 · 그림자)를 따른다.
 *
 * 배경을 누르거나 ESC 를 눌러 닫는다. 열려 있는 동안은 뒤 화면이 스크롤되지 않게 막는다.
 */
export function Modal({
  open,
  onClose,
  label,
  contentWidth = 'max-w-[425px]',
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-12"
      // 누른 지점이 배경일 때만 닫는다. click 을 쓰면 카드 안에서 드래그해 배경에서 뗐을 때도 닫힌다.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="flex w-full max-w-[577px] flex-col items-center rounded-3xl bg-white px-6 py-14 shadow-[0_16px_72px_0_rgba(23,23,23,0.16)]"
      >
        <div className={'flex w-full flex-col items-center gap-12 ' + contentWidth}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** 팝업 제목 + 본문. 시안의 24px Bold / 18px Regular 묶음이다. */
export function ModalHeading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      <h2 className="text-cool-neutral-50 w-full text-2xl leading-[1.6] font-bold">{title}</h2>
      <div className="text-cool-neutral-80 text-lg leading-6">{children}</div>
    </div>
  )
}
