import { useState } from 'react'
import type { Photo } from '../form/PhotoPicker'
import { StepTitle } from './StepTitle'
import { StepBody } from './StepBody'
import { BUILDING_TYPES } from './buildingTypes'
import { ARC_REQUIREMENTS, GENDER_POLICIES, SUPPORTED_LANGUAGES, type CatalogItem } from './catalogs'
import { SPACE_TYPES } from './spaceTypes'
import type { ListingDraft } from './draft'

type ReviewStepProps = {
  draft: ListingDraft
  photos: Photo[]
  roomPhotos: Record<string, Photo[]>
  onSaveDraft?: () => void
  /** 수정 모드의 마지막 확인 화면에서 입력 단계로 돌아간다. */
  onPrev?: () => void
  onSubmit: () => void
  editing?: boolean
  /** 보내는 중이면 버튼을 잠근다. 두 번 누르면 매물이 두 개 생긴다. */
  submitting: boolean
  submitError: string | null
}

/*
 * 담아 둔 건 서버 코드고 여기 보여 줄 건 라벨이다.
 *
 * 화면 곳곳에서 칩을 고르면 `FEMALE_ONLY` 같은 코드가 draft 에 들어간다. 그걸 그대로 찍으면
 * 임대인이 마지막으로 훑어보는 화면에 알아볼 수 없는 글자가 뜬다.
 */
const labelOf = (catalog: CatalogItem[], code: string) =>
  catalog.find((item) => item.code === code)?.label ?? ''

const labelsOf = (catalog: CatalogItem[], codes: string[]) =>
  codes.map((code) => labelOf(catalog, code)).filter(Boolean)

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
export function ReviewStep({
  draft,
  photos,
  roomPhotos,
  onSaveDraft,
  onPrev,
  onSubmit,
  editing = false,
  submitting,
  submitError,
}: ReviewStepProps) {
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
        labelOf(BUILDING_TYPES, draft.building.buildingType),
        draft.building.totalFloors &&
          `${draft.building.totalFloors} 중 ${draft.building.operatingFloors}`,
      ]),
    },
    {
      label: '입주 조건',
      value: orDash([
        labelOf(GENDER_POLICIES, draft.conditions.genderRule),
        draft.conditions.arcRule && `ARC ${labelOf(ARC_REQUIREMENTS, draft.conditions.arcRule)}`,
        labelsOf(SUPPORTED_LANGUAGES, draft.conditions.languages).join(', '),
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
    <StepBody>
      <div className="flex w-full max-w-[980px] flex-col gap-8">
        <StepTitle>입력하신 내용을 확인해 주세요.</StepTitle>

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
            {editing ? (
              <button
                type="button"
                onClick={onPrev}
                className="bg-cool-neutral-20 border-line-alternative flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition-colors hover:brightness-105"
              >
                이전
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onSaveDraft?.()
                  setSaved(true)
                }}
                className="bg-cool-neutral-20 border-line-alternative flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition-colors hover:brightness-105"
              >
                {saved ? '저장했어요' : '임시 저장'}
              </button>
            )}
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="bg-cool-neutral-80 border-line-alternative disabled:bg-cool-neutral-20 flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition-colors hover:brightness-125 disabled:cursor-not-allowed disabled:hover:brightness-100"
            >
              {submitting ? '보내는 중…' : editing ? '수정 요청하기' : '제출하기'}
            </button>
          </div>
        </div>

        {/* 실패해도 적은 내용은 그대로 둔다. 다시 누르면 그 상태로 다시 보낸다. */}
        {submitError && (
          <p role="alert" className="text-status-red-50 w-full text-center text-sm leading-5">
            {submitError}
          </p>
        )}
      </div>
    </StepBody>
  )
}
