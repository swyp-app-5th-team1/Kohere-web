import { useEffect, useState } from 'react'
import { Field } from '../form/Field'
import { TextField } from '../form/TextField'
import { openPostcodeSearch, preloadPostcodeScript } from '../../lib/postcode'
import { StepFooter } from './StepFooter'
import { StepTitle } from './StepTitle'
import type { BranchDraft } from './draft'
import locationUrl from '../../assets/icon-location.svg'

const DESCRIPTION_MAX = 500

type BranchInfoStepProps = {
  value: BranchDraft
  onChange: (patch: Partial<BranchDraft>) => void
  onPrev: () => void
  onNext: () => void
}

/**
 * 매물 등록 1단계 — 지점 정보.
 *
 * 인근 역 자동 계산과 서버 저장은 API 연동 때 붙인다.
 */
export function BranchInfoStep({ value, onChange, onPrev, onNext }: BranchInfoStepProps) {
  const [searchFailed, setSearchFailed] = useState(false)

  // 버튼을 누른 뒤에 받으면 사용자 조작 맥락이 끊겨 팝업이 막힌다. 화면에 들어올 때 미리 받는다.
  useEffect(() => {
    preloadPostcodeScript().catch(() => setSearchFailed(true))
  }, [])

  function handleAddressSearch() {
    setSearchFailed(false)
    openPostcodeSearch(
      ({ postalCode, address }) => onChange({ postalCode, address }),
      () => setSearchFailed(true),
    )
  }

  const filled =
    value.name.trim() !== '' &&
    value.address.trim() !== '' &&
    value.addressDetail.trim() !== '' &&
    value.nearbyStation.trim() !== '' &&
    value.description.trim() !== ''

  return (
    <>
      <main className="flex w-full flex-1 flex-col items-center px-6 py-14">
        <div className="flex w-full max-w-[980px] flex-col gap-8">
          <StepTitle>지점을 소개해 주세요.</StepTitle>

          <Field label="지점명">
            <TextField
              value={value.name}
              onChange={(event) => onChange({ name: event.target.value })}
              placeholder="지점 이름을 입력하세요"
              className="font-medium"
              />
          </Field>

          <div className="flex w-full flex-col gap-5">
            <Field label="주소">
              <div className="flex w-full flex-col gap-1">
                <div className="flex w-full items-stretch gap-5">
                  {/* 시안대로 검색으로만 채운다. 직접 고치면 우편번호와 어긋나서 막아 둔다. */}
                  <TextField
                    value={value.address}
                    readOnly
                    onClick={handleAddressSearch}
                    placeholder="주소 검색하기"
                    className="min-w-0 flex-1 cursor-pointer font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddressSearch}
                    className="bg-label-normal border-line-normal flex w-[158px] shrink-0 items-center justify-center rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition-colors hover:brightness-125"
                  >
                    주소검색
                  </button>
                </div>

                {searchFailed && (
                  <span role="alert" className="px-1 text-xs leading-5 text-red-600">
                    주소 검색 창을 열지 못했습니다. 팝업 차단을 해제하고 다시 시도해 주세요.
                  </span>
                )}
              </div>
            </Field>

            <Field label="상세 주소">
              <TextField
                value={value.addressDetail}
                onChange={(event) => onChange({ addressDetail: event.target.value })}
                placeholder="예: 101동"
                className="font-medium"
              />
            </Field>
          </div>

          <Field label="인근 역">
            {/* 아이콘과 버튼이 안에 들어가는 칸이라 TextField 를 못 쓴다. 상태만 같게 맞췄다. */}
            <div className="border-gray-300 hover:border-neutral-30 hover:bg-cool-neutral-5 focus-within:border-primary-50 focus-within:bg-white flex h-14 w-full items-center gap-3 rounded-2xl border bg-white px-4 transition-colors">
              <img src={locationUrl} alt="" className="size-6 shrink-0" />
              <input
                value={value.nearbyStation}
                onChange={(event) => onChange({ nearbyStation: event.target.value })}
                placeholder="예: 2호선 신촌역 도보 7분"
                aria-label="인근 역"
                className="text-cool-neutral-80 placeholder:text-cool-neutral-10 min-w-0 flex-1 text-lg leading-6 outline-none placeholder:font-medium"
              />
              <button
                type="button"
                className="text-cool-neutral-30 shrink-0 text-xs leading-6 font-medium"
              >
                위치 수정
              </button>
            </div>
          </Field>

          <Field
            label="지점 소개글"
            labelEnd={
              <span className="text-label-neutral text-sm leading-5 font-medium">
                {value.description.length} / {DESCRIPTION_MAX}
              </span>
            }
          >
            <textarea
              value={value.description}
              onChange={(event) => onChange({ description: event.target.value })}
              maxLength={DESCRIPTION_MAX}
              placeholder="지점을 소개하는 내용을 작성해주세요"
              className="placeholder:text-cool-neutral-10 focus:border-cool-neutral-50 h-[100px] w-full resize-none rounded-2xl border border-gray-300 bg-white p-4 text-lg leading-6 font-medium outline-none transition-colors"
            />
          </Field>
        </div>
      </main>

      <StepFooter step={1} onPrev={onPrev} onNext={onNext} nextDisabled={!filled} />
    </>
  )
}
