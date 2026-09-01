import { Modal, ModalHeading } from '../Modal'
import { ctaPrimaryClass, ctaSecondaryClass } from '../form/CtaButton'

type ResumeDraftDialogProps = {
  open: boolean
  /** 임시 저장을 버리고 처음부터. 되돌릴 수 없다. */
  onRestart: () => void
  /** 저장된 지점부터 이어서 쓴다. */
  onResume: () => void
}

/**
 * 등록 화면에 들어왔는데 임시 저장이 남아 있을 때 먼저 묻는 팝업.
 *
 * 배경 클릭 · ESC 로 닫히지 않는다(Modal 에 onClose 를 넘기지 않는다). 두 선택지가 모두
 * 「닫기」가 아니라 행동이고, 한쪽은 저장분을 지워서 되돌릴 수 없다. 버튼으로만 고르게 한다.
 */
export function ResumeDraftDialog({ open, onRestart, onResume }: ResumeDraftDialogProps) {
  return (
    <Modal open={open} label="임시저장된 매물">
      <ModalHeading title="임시저장된 매물이 있습니다">
        <p>이어서 등록하시겠습니까?</p>
      </ModalHeading>

      <div className="flex w-full gap-2.5">
        <button type="button" onClick={onRestart} className={`${ctaSecondaryClass} flex-1`}>
          새로 등록하기
        </button>
        <button type="button" onClick={onResume} className={`${ctaPrimaryClass} flex-1`}>
          이어서 하기
        </button>
      </div>
    </Modal>
  )
}
