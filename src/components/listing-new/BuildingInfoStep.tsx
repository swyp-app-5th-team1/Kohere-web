import { Chip, ChipGroup } from '../form/Chip'
import { Field, FieldError } from '../form/Field'
import { useTouched } from '../form/useTouched'
import { PhotoPicker, type Photo } from '../form/PhotoPicker'
import { TextField } from '../form/TextField'
import { StepFooter } from './StepFooter'
import { StepTitle } from './StepTitle'
import { StepBody } from './StepBody'
import { BUILDING_TYPES } from './buildingTypes'
import { floorCountError, floorSpanError, parseCount } from './ranges'
import type { BuildingDraft } from './draft'

type BuildingInfoStepProps = {
  value: BuildingDraft
  onChange: (patch: Partial<BuildingDraft>) => void
  /** 사진은 File 이라 임시 저장에 담기지 않고 등록 화면이 들고 있는다. */
  photos: Photo[]
  onAddPhotos: (files: File[]) => void
  onRemovePhoto: (index: number) => void
  onMakePhotoPrimary: (index: number) => void
  onMovePhoto: (from: number, to: number) => void
  photoFailures: { name: string; reason: string }[]
  onPrev: () => void
  onNext: () => void
}

/** 매물 등록 2단계 — 건물 정보. */
export function BuildingInfoStep({
  value,
  onChange,
  photos,
  onAddPhotos,
  onRemovePhoto,
  onMakePhotoPrimary,
  onMovePhoto,
  photoFailures,
  onPrev,
  onNext,
}: BuildingInfoStepProps) {
  const touched = useTouched()

  /* 서버가 400 을 내는 조건을 미리 본다 — ranges.ts 의 형식 규칙을 그대로 쓴다. */
  const totalFloorsError = floorCountError(value.totalFloors)
  const floorRangeError = floorSpanError(value.operatingFloors, parseCount(value.totalFloors))

  /* 다음 버튼은 위 값으로 잠그고, 빨간 문구는 한 번 다녀간 칸에만 그린다. */
  const shownTotalFloorsError = touched.error('totalFloors', totalFloorsError)
  const shownFloorRangeError = touched.error('operatingFloors', floorRangeError)

  const filled =
    totalFloorsError === null &&
    floorRangeError === null &&
    value.buildingType !== '' &&
    value.totalFloors.trim() !== '' &&
    value.operatingFloors.trim() !== '' &&
    value.hasParking !== null &&
    value.hasElevator !== null &&
    photos.length > 0

  return (
    <>
      <StepBody>
        <div className="flex w-full max-w-[980px] flex-col gap-8">
          <StepTitle>건물 정보를 입력해주세요.</StepTitle>

          <div className="flex w-full flex-col gap-8">
            <Field label="건물 형태">
              <ChipGroup>
                {/* 화면에는 라벨을 보이고 담는 건 서버 코드다. buildingTypes.ts 참고. */}
                {BUILDING_TYPES.map((type) => (
                  <Chip
                    key={type.code}
                    selected={value.buildingType === type.code}
                    onClick={() => onChange({ buildingType: type.code })}
                  >
                    {type.label}
                  </Chip>
                ))}
              </ChipGroup>
            </Field>

            <div className="flex w-full gap-[50px]">
              {/*
                시안 예시대로 「8층」이라 적어도 되고, 보낼 때만 「층」을 뗀다. 다만 숫자만
                훑어 내지는 않는다 — 그러면 「지하1~4층」이 「1~4」가 되고 「8, 9층」이 89층이
                되어, 화면에 보이는 것과 보내는 값이 달라진다(ranges.ts 참고).
              */}
              <div className="min-w-0 flex-1">
                <Field label="총 층수">
                  <div className="flex w-full flex-col gap-1">
                    <TextField
                      value={value.totalFloors}
                      inputMode="numeric"
                      error={shownTotalFloorsError !== null}
                      onChange={(event) => onChange({ totalFloors: event.target.value })}
                      onBlur={() => touched.touch('totalFloors')}
                      placeholder="예: 8층"
                      className="font-medium"
                    />
                    {shownTotalFloorsError && <FieldError>{shownTotalFloorsError}</FieldError>}
                  </div>
                </Field>
              </div>
              <div className="min-w-0 flex-1">
                <Field label="지점 운영층">
                  <div className="flex w-full flex-col gap-1">
                    <TextField
                      value={value.operatingFloors}
                      inputMode="numeric"
                      error={shownFloorRangeError !== null}
                      onChange={(event) => onChange({ operatingFloors: event.target.value })}
                      onBlur={() => touched.touch('operatingFloors')}
                      placeholder="예: 2층 또는 2~4층"
                      className="font-medium"
                    />
                    {shownFloorRangeError && <FieldError>{shownFloorRangeError}</FieldError>}
                  </div>
                </Field>
              </div>
            </div>

            <Field label="주차공간">
              <ChipGroup gap="gap-5">
                <Chip
                  selected={value.hasParking === true}
                  onClick={() => onChange({ hasParking: true })}
                  className="w-[200px]"
                >
                  있음
                </Chip>
                <Chip
                  selected={value.hasParking === false}
                  onClick={() => onChange({ hasParking: false })}
                  className="w-[200px]"
                >
                  없음
                </Chip>
              </ChipGroup>
            </Field>

            <Field label="엘리베이터">
              <ChipGroup gap="gap-5">
                <Chip
                  selected={value.hasElevator === true}
                  onClick={() => onChange({ hasElevator: true })}
                  className="w-[200px]"
                >
                  있음
                </Chip>
                <Chip
                  selected={value.hasElevator === false}
                  onClick={() => onChange({ hasElevator: false })}
                  className="w-[200px]"
                >
                  없음
                </Chip>
              </ChipGroup>
            </Field>

            <Field label="지점 대표사진 (1장 이상)">
              <PhotoPicker
                photos={photos}
                onAdd={onAddPhotos}
                onRemove={onRemovePhoto}
                onMakePrimary={onMakePhotoPrimary}
                onMove={onMovePhoto}
                failures={photoFailures}
              />
            </Field>
          </div>
        </div>
      </StepBody>

      <StepFooter step={2} onPrev={onPrev} onNext={onNext} nextDisabled={!filled} />
    </>
  )
}
