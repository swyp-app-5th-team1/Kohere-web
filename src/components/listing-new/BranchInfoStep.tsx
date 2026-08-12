import { Field, inputClass } from '../form/Field'
import { StepFooter } from './StepFooter'
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
 * UI 만 잡아둔 상태다. 주소 검색(다음 우편번호 등) · 인근 역 자동 계산 ·
 * 서버 저장은 API 연동 때 붙인다.
 */
export function BranchInfoStep({ value, onChange, onPrev, onNext }: BranchInfoStepProps) {
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
          <h1 className="text-[32px] leading-6 font-bold text-[#242424]">지점을 소개해 주세요.</h1>

          <Field label="지점명">
            <input
              value={value.name}
              onChange={(event) => onChange({ name: event.target.value })}
              placeholder="지점 이름을 입력하세요"
              className={inputClass + ' font-medium'}
            />
          </Field>

          <div className="flex w-full flex-col gap-5">
            <Field label="주소">
              <div className="flex w-full items-stretch gap-5">
                {/*
                 * 시안은 주소 검색으로만 채우는 읽기 전용 칸이다. 검색 연동 전까지는
                 * 다음 단계로 넘어갈 방법이 없어 임시로 직접 입력을 열어 뒀다.
                 */}
                <input
                  value={value.address}
                  onChange={(event) => onChange({ address: event.target.value })}
                  placeholder="주소 검색하기"
                  className={inputClass + ' min-w-0 flex-1 font-medium'}
                />
                <button
                  type="button"
                  className="bg-label-normal border-line-normal flex w-[158px] shrink-0 items-center justify-center rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition-colors hover:brightness-125"
                >
                  주소검색
                </button>
              </div>
            </Field>

            <Field label="상세 주소">
              <input
                value={value.addressDetail}
                onChange={(event) => onChange({ addressDetail: event.target.value })}
                placeholder="예: 101동"
                className={inputClass + ' font-medium'}
              />
            </Field>
          </div>

          <Field label="인근 역">
            <div className="flex h-14 w-full items-center gap-3 rounded-2xl border border-gray-300 bg-white px-4">
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
