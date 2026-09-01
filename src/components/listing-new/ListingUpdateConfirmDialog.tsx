import { Modal, ModalHeading } from '../Modal'
import { LoadingIndicator } from '../LoadingIndicator'
import { ctaDisabledClass, ctaPrimaryClass, ctaSecondaryClass } from '../form/CtaButton'

type ListingUpdateConfirmDialogProps = {
  open: boolean
  submitting: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** 공개 매물은 재심사 동안 앱에서 숨겨지므로 PUT 직전에 반드시 알린다. */
export function ListingUpdateConfirmDialog({
  open,
  submitting,
  onCancel,
  onConfirm,
}: ListingUpdateConfirmDialogProps) {
  return (
    <Modal open={open} label="매물 수정 요청 확인">
      <ModalHeading title="수정을 요청하시겠습니까?">
        <p>
          수정하면 재심사를 통과할 때까지
          <br />
          앱에서 매물이 노출되지 않습니다.
        </p>
      </ModalHeading>

      <div className="flex w-full gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className={`${submitting ? ctaDisabledClass : ctaSecondaryClass} flex-1`}
        >
          뒤로가기
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className={`${submitting ? ctaDisabledClass : ctaPrimaryClass} flex-1`}
        >
          {submitting && <LoadingIndicator />}
          수정하기
        </button>
      </div>
    </Modal>
  )
}
