import type { MyListingStatus } from '../../api/listings'

/** 심사 목록 카드와 심사 상세 제목 아래에 같은 모양으로 붙는 상태 배지. */
export const STATUS_BADGES: Record<MyListingStatus, { label: string; className: string }> = {
  PENDING: { label: '심사대기', className: 'bg-[#e1e2e4] text-[#505050]' },
  PUBLISHED: { label: '승인완료', className: 'bg-[#ccfaed] text-[#008b64]' },
  UPDATE_PENDING: { label: '수정신청', className: 'bg-[#e8f1fd] text-[#165abd]' },
  REJECTED: { label: '반려', className: 'bg-[#feece9] text-[#c60e21]' },
}

export const statusBadgeClass =
  'flex h-6 shrink-0 items-center justify-center rounded-[4px] px-3 py-0.5 text-sm leading-5 font-medium whitespace-nowrap'
