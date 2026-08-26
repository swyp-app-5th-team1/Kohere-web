import { useEffect, useState } from 'react'
import {
  searchAddresses,
  searchErrorMessage,
  searchNearbyStations,
  searchStations,
  type AddressCandidate,
  type StationCandidate,
} from '../../api/listings'
import { Field, FieldError } from '../form/Field'
import { TextField } from '../form/TextField'
import {
  openPostcodeSearch,
  postcodeKeyword,
  preloadPostcodeScript,
  type PostcodeResult,
} from '../../lib/postcode'
import { narrowCandidates } from '../../lib/addressMatch'
import { CandidateDialog } from './CandidateDialog'
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
 * 주소와 인근 역 모두 **서버가 준 후보 한 건을 가공 없이 그대로** 담는다. 임대인이 직접
 * 칠 수 있는 칸이 아니다 — 좌표와 짝이 맞아야 하고, 역 이름은 서버 표준 표기여야 한다.
 *
 * 주소는 다음 우편번호로 고른 뒤 그 문자열로 주소 검색 API 를 다시 부른다. 우편번호 창이
 * 좌표를 주지 않아서다. 사용자는 이미 한 번 골랐으니 후보가 하나면 그대로 쓰고, 여러 건일
 * 때만 다시 묻는다.
 */
export function BranchInfoStep({ value, onChange, onPrev, onNext }: BranchInfoStepProps) {
  const [postcodeFailed, setPostcodeFailed] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)

  /** 우편번호 창에서 고른 주소가 후보 여러 건으로 갈릴 때만 띄운다. */
  const [addressCandidates, setAddressCandidates] = useState<AddressCandidate[] | null>(null)
  /** 인근 역 팝업. 열 때 좌표로 미리 받아 둔 목록을 함께 넘긴다. */
  const [stationOpen, setStationOpen] = useState(false)
  const [nearbyStations, setNearbyStations] = useState<StationCandidate[]>([])

  // 버튼을 누른 뒤에 받으면 사용자 조작 맥락이 끊겨 팝업이 막힌다. 화면에 들어올 때 미리 받는다.
  useEffect(() => {
    preloadPostcodeScript().catch(() => setPostcodeFailed(true))
  }, [])

  /** 우편번호 창이 준 우편번호. 주소가 확정될 때 함께 담으려고 들고 있는다. */
  const [pendingPostalCode, setPendingPostalCode] = useState('')

  function applyAddress(candidate: AddressCandidate, postalCode = pendingPostalCode) {
    // 우편번호 창이 준 문자열이 아니라 이 값을 담는다. 아래 좌표와 짝이 맞아야 한다.
    onChange({
      postalCode,
      address: candidate.roadAddress,
      lat: candidate.lat,
      lng: candidate.lng,
    })
    setAddressCandidates(null)
    setAddressError(null)
  }

  /**
   * 우편번호 창에서 고른 주소를 좌표까지 있는 표준 주소로 바꾼다.
   *
   * 조회가 끝나기 전에는 칸을 건드리지 않는다. 우편번호 창이 준 주소를 먼저 넣어 버리면,
   * 실패했을 때 「주소는 칸에 멀쩡히 있는데 위치를 못 찾았다」는 모순된 화면이 된다.
   */
  async function resolveAddress(picked: PostcodeResult) {
    setResolving(true)
    setAddressError(null)
    setPendingPostalCode(picked.postalCode)

    try {
      const { items } = await searchAddresses(postcodeKeyword(picked))

      if (items.length === 0) {
        /*
         * 우편번호 창에서 고른 주소인데도 비는 경우다. 지도 서비스 쪽 DB 반영이 늦었거나,
         * 애초에 도로명이 부여되지 않은 곳이다(서버가 도로명 없는 결과를 제외한다).
         * 둘 다 다시 눌러도 같은 결과라, 재시도가 아니라 다른 주소를 권해야 한다.
         */
        setAddressError(
          '이 주소는 지도 서비스에 아직 등록되지 않았거나 도로명주소가 없는 곳이라 위치를 확인할 수 없습니다. 같은 건물의 다른 주소나 인근 건물 주소로 검색해 주세요.',
        )
        return
      }

      /*
       * 사용자가 우편번호 창에서 고른 그 주소와 맞는 후보만 남긴다. 한 건으로 좁혀지면
       * 이미 한 번 고른 셈이라 다시 묻지 않는다.
       *
       * 후보가 하나뿐이어도 그냥 쓰지 않는다. 지오코더가 비슷한 다른 주소를 한 건
       * 돌려주는 경우가 있어서, 검증 없이 받으면 그게 조용히 좌표가 된다.
       */
      const matched = narrowCandidates(picked, items)
      if (matched.length === 1) {
        applyAddress(matched[0], picked.postalCode)
        return
      }

      // 못 좁혔으면 사람에게 묻는다. 맞아 보이는 것들을 위로 올려 준다.
      setAddressCandidates([...matched, ...items.filter((item) => !matched.includes(item))])
    } catch (error) {
      setAddressError(searchErrorMessage(error))
    } finally {
      setResolving(false)
    }
  }

  function handleAddressSearch() {
    setPostcodeFailed(false)
    openPostcodeSearch(
      (result) => resolveAddress(result),
      () => setPostcodeFailed(true),
    )
  }

  /** 인근 역 팝업을 연다. 좌표가 있으면 검색어 없이 주변 목록부터 채워 둔다. */
  async function openStationPicker() {
    if (value.lat === null || value.lng === null) return

    setStationOpen(true)
    try {
      const { items } = await searchNearbyStations(value.lat, value.lng)
      setNearbyStations(items)
    } catch {
      // 실패해도 팝업은 열어 둔다. 이름으로 검색하면 되기 때문이다.
      setNearbyStations([])
    }
  }

  const filled =
    value.name.trim() !== '' &&
    value.address.trim() !== '' &&
    value.lat !== null &&
    value.lng !== null &&
    value.addressDetail.trim() !== '' &&
    value.nearestTransit !== null &&
    value.description.trim() !== ''

  const transitLabel = value.nearestTransit
    ? `${value.nearestTransit.name} 도보 ${value.nearestTransit.walkMinutes}분`
    : ''

  /** 목록 한 줄. 서버가 준 문자열을 그대로 쓴다. */
  const stationRow = (station: StationCandidate) => ({
    primary: station.name,
    secondary: station.roadAddress,
    trailing:
      station.suggestedWalkMinutes === null ? undefined : `도보 ${station.suggestedWalkMinutes}분`,
  })

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
                  {/* 검색으로만 채운다. 직접 고치면 좌표와 어긋나서 막아 둔다. */}
                  <TextField
                    value={value.address}
                    readOnly
                    error={addressError !== null}
                    onClick={handleAddressSearch}
                    placeholder="주소 검색하기"
                    className="min-w-0 flex-1 cursor-pointer font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddressSearch}
                    disabled={resolving}
                    className="bg-label-normal border-line-normal disabled:bg-cool-neutral-20 flex w-[158px] shrink-0 items-center justify-center rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition-colors hover:brightness-125 disabled:cursor-not-allowed"
                  >
                    {resolving ? '확인 중…' : '주소검색'}
                  </button>
                </div>

                {postcodeFailed && (
                  <FieldError>
                    주소 검색 창을 열지 못했습니다. 팝업 차단을 해제하고 다시 시도해 주세요.
                  </FieldError>
                )}
                {addressError && <FieldError>{addressError}</FieldError>}
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
            <div className="flex w-full flex-col gap-1">
              {/*
                아이콘과 버튼이 안에 들어가는 칸이라 TextField 를 못 쓴다. 상태만 같게 맞췄다.
                값은 임대인이 치는 게 아니라 팝업에서 고른 결과라 입력칸이 아니다.
              */}
              <button
                type="button"
                onClick={openStationPicker}
                disabled={value.lat === null}
                className="border-gray-300 hover:border-neutral-30 hover:bg-cool-neutral-5 disabled:border-transparent disabled:bg-cool-neutral-7 flex h-14 w-full items-center gap-3 rounded-2xl border bg-white px-4 text-left transition-colors disabled:cursor-not-allowed"
              >
                <img src={locationUrl} alt="" className="size-6 shrink-0" />
                <span
                  className={
                    'min-w-0 flex-1 truncate text-lg leading-6 ' +
                    (transitLabel ? 'text-cool-neutral-80' : 'text-cool-neutral-10 font-medium')
                  }
                >
                  {transitLabel || '예: 2호선 신촌역 도보 7분'}
                </span>
                <span className="text-cool-neutral-30 shrink-0 text-xs leading-6 font-medium">
                  {transitLabel ? '위치 수정' : '역 찾기'}
                </span>
              </button>

              {/* 좌표가 있어야 거리를 잴 수 있다. 주소를 먼저 고르라고 알려 준다. */}
              {value.lat === null && (
                <span className="text-cool-neutral-40 px-2 text-xs leading-4">
                  주소를 먼저 검색하면 인근 역을 찾을 수 있습니다.
                </span>
              )}
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

      {/* 우편번호 창에서 고른 주소가 여러 건으로 갈릴 때만 뜬다. */}
      <CandidateDialog<AddressCandidate>
        open={addressCandidates !== null}
        onClose={() => setAddressCandidates(null)}
        title="주소 선택"
        placeholder="예: 신촌로 12"
        initialItems={addressCandidates ?? []}
        emptyHint="도로명과 건물번호까지 넣어 주세요. (예: 신촌로 12)"
        onSearch={async (keyword) => (await searchAddresses(keyword)).items}
        onSelect={applyAddress}
        renderItem={(item) => ({ primary: item.roadAddress, secondary: item.jibunAddress })}
        keyOf={(item) => `${item.lat},${item.lng},${item.roadAddress}`}
      />

      <CandidateDialog<StationCandidate>
        open={stationOpen}
        onClose={() => setStationOpen(false)}
        title="인근 역 선택"
        placeholder="역 이름으로 검색 (예: 신촌)"
        initialItems={nearbyStations}
        initialLabel="추천 · 주소 주변의 역"
        emptyHint="찾는 역이 없습니다. 역 이름으로 검색해 보세요."
        onSearch={async (keyword) =>
          (await searchStations(keyword, value.lat!, value.lng!)).items
        }
        onSelect={(station) => {
          /*
           * 좌표를 함께 보내므로 도보시간이 채워져서 온다. null 이면 서버가 거리를 못 잰
           * 것이라 등록에 실을 값이 없다 — 그런 후보는 고르지 못하게 두는 편이 낫지만,
           * 지금은 0 으로 두지 않고 그대로 막는다.
           */
          if (station.suggestedWalkMinutes === null) return
          onChange({
            nearestTransit: { name: station.name, walkMinutes: station.suggestedWalkMinutes },
          })
          setStationOpen(false)
        }}
        renderItem={stationRow}
        keyOf={(item) => `${item.name},${item.lat},${item.lng}`}
      />

      <StepFooter step={1} onPrev={onPrev} onNext={onNext} nextDisabled={!filled} />
    </>
  )
}
