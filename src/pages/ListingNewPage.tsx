import { useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { Field, inputClass } from '../components/form/Field'
import arrowLeftUrl from '../assets/icon-arrow-left.svg'
import arrowRightUrl from '../assets/icon-arrow-right.svg'
import locationUrl from '../assets/icon-location.svg'

const TOTAL_STEPS = 7
const DESCRIPTION_MAX = 500

/**
 * 매물 등록 1단계 — 지점 정보.
 *
 * UI 만 잡아둔 상태다. 주소 검색(다음 우편번호 등) · 인근 역 자동 계산 · 스텝 이동 ·
 * 서버 저장은 API 연동 때 붙인다. step 은 다음 단계 화면이 생기면 상태로 바꾼다.
 */
export default function ListingNewPage() {
  const step = 1

  const [name, setName] = useState('')
  // 주소는 주소 검색 연동 때 setter 를 쓰게 되므로 지금은 값만 둔다.
  const [address] = useState('')
  const [addressDetail, setAddressDetail] = useState('')
  const [nearbyStation, setNearbyStation] = useState('')
  const [description, setDescription] = useState('')

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <AppHeader />

      <main className="flex w-full flex-1 flex-col items-center px-6 py-14">
        <div className="flex w-full max-w-[980px] flex-col gap-8">
          <h1 className="text-[32px] leading-6 font-bold text-[#242424]">지점을 소개해 주세요.</h1>

          <Field label="지점명">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="지점 이름을 입력하세요"
              className={inputClass + ' font-medium'}
            />
          </Field>

          <div className="flex w-full flex-col gap-5">
            <Field label="주소">
              <div className="flex w-full items-stretch gap-5">
                {/* 도로명 주소는 직접 입력 대신 주소 검색으로 채울 예정이라 읽기 전용으로 둔다. */}
                <input
                  value={address}
                  readOnly
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
                value={addressDetail}
                onChange={(event) => setAddressDetail(event.target.value)}
                placeholder="예: 101동"
                className={inputClass + ' font-medium'}
              />
            </Field>
          </div>

          <Field label="인근 역">
            <div className="flex h-14 w-full items-center gap-3 rounded-2xl border border-gray-300 bg-white px-4">
              <img src={locationUrl} alt="" className="size-6 shrink-0" />
              <input
                value={nearbyStation}
                onChange={(event) => setNearbyStation(event.target.value)}
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
                {description.length} / {DESCRIPTION_MAX}
              </span>
            }
          >
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={DESCRIPTION_MAX}
              placeholder="지점을 소개하는 내용을 작성해주세요"
              className="placeholder:text-cool-neutral-10 focus:border-cool-neutral-50 h-[100px] w-full resize-none rounded-2xl border border-gray-300 bg-white p-4 text-lg leading-6 font-medium outline-none transition-colors"
            />
          </Field>
        </div>
      </main>

      <footer className="w-full shrink-0">
        {/* 스텝 진행 표시줄. 지나온 스텝만 진하게 칠한다. */}
        <div className="flex w-full gap-[7px]">
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <div
              key={index}
              className={
                'h-1.5 flex-1 rounded-full ' +
                (index < step ? 'bg-neutral-70' : 'bg-cool-neutral-7')
              }
            />
          ))}
        </div>

        <div className="mx-auto flex w-full max-w-[980px] items-center justify-between px-6 py-10">
          <button
            type="button"
            disabled={step === 1}
            className="bg-cool-neutral-20 border-line-normal flex h-12 w-[158px] items-center justify-center gap-3 rounded-2xl border px-3 text-base leading-6 font-semibold text-white disabled:cursor-not-allowed"
          >
            <img src={arrowLeftUrl} alt="" className="size-6" />
            이전
          </button>
          <button
            type="button"
            className="bg-label-normal border-line-normal flex h-12 w-[158px] items-center justify-center gap-3 rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition-colors hover:brightness-125"
          >
            다음
            <img src={arrowRightUrl} alt="" className="size-6" />
          </button>
        </div>
      </footer>
    </div>
  )
}
