import { useState } from 'react'
import type { Photo } from '../form/PhotoPicker'
import { SPACE_TYPES } from './spaceTypes'
import type { ListingDraft } from './draft'

type ReviewStepProps = {
  draft: ListingDraft
  photos: Photo[]
  roomPhotos: Record<string, Photo[]>
  onSaveDraft: () => void
  onSubmit: () => void
}

/** 값이 비어 있으면 줄이 통째로 사라지지 않도록 표시만 바꾼다. */
const orDash = (parts: (string | number | false | null | undefined)[]) => {
  const filled = parts.filter((part): part is string | number => Boolean(part))
  return filled.length > 0 ? filled.join(' · ') : '-'
}

/**
 * 매물 등록 마지막 확인 화면.
 *
 * 진행 표시줄과 이전/다음이 없고 임시 저장 · 제출하기만 있다. 요약 문구는 시안의
 * "값 · 값" 모양을 따르되 실제로 입력한 값을 보여준다.
 */
export function ReviewStep({ draft, photos, roomPhotos, onSaveDraft, onSubmit }: ReviewStepProps) {
  const [saved, setSaved] = useState(false)

  const spaceTypeLabel = SPACE_TYPES.find((type) => type.value === draft.spaceType)?.label
  const roomPhotoCount = Object.values(roomPhotos).reduce((sum, list) => sum + list.length, 0)

  const rows = [
    {
      label: '공간 유형 · 위치',
      value: orDash([spaceTypeLabel, [draft.branch.address, draft.branch.addressDetail]
        .filter(Boolean)
        .join(' ')]),
    },
    {
      label: '지점 소개',
      value: orDash([draft.branch.name, photos.length > 0 && `사진 ${photos.length}장`]),
    },
    {
      label: '건물 정보',
      value: orDash([
        draft.building.buildingType,
        draft.building.totalFloors &&
          `${draft.building.totalFloors} 중 ${draft.building.operatingFloors}`,
      ]),
    },
    {
      label: '입주 조건',
      value: orDash([
        draft.conditions.genderRule,
        draft.conditions.arcRule && `ARC ${draft.conditions.arcRule}`,
        draft.conditions.languages.join(', '),
      ]),
    },
    {
      label: '공동 시설',
      value: draft.amenities.length > 0 ? `${draft.amenities.length}개 항목 선택` : '-',
    },
    {
      label: '객실 타입',
      value: orDash([
        draft.roomTypes
          .map((room, index) => room.name.trim() || `${String.fromCharCode(65 + index)}타입`)
          .join(' · '),
        roomPhotoCount > 0 && `사진 ${roomPhotoCount}장`,
      ]),
    },
    {
      label: '담당자 정보',
      value: orDash([draft.contact.managerName, draft.contact.phone]),
    },
  ]

  return (
    <main className="flex w-full flex-1 flex-col items-center px-6 py-14">
      <div className="flex w-full max-w-[980px] flex-col gap-8">
        <h1 className="text-[32px] leading-6 font-bold text-[#242424]">
          입력하신 내용을 확인해 주세요.
        </h1>

        <div className="border-line-normal divide-line-normal flex w-full flex-col divide-y overflow-hidden rounded-2xl border bg-white">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-2.5 p-4">
              <span className="text-neutral-70 text-lg leading-6 font-semibold">{row.label}</span>
              <span className="text-cool-neutral-30 text-base leading-6 font-medium">
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className="flex w-full justify-center">
          <div className="flex w-[423px] items-start gap-2.5">
            <button
              type="button"
              onClick={() => {
                onSaveDraft()
                setSaved(true)
              }}
              className="bg-cool-neutral-20 border-line-alternative flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition-colors hover:brightness-105"
            >
              {saved ? '저장했어요' : '임시 저장'}
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="bg-cool-neutral-80 border-line-alternative flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition-colors hover:brightness-125"
            >
              제출하기
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
