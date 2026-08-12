import { Chip, ChipGroup } from '../form/Chip'
import { Field, inputClass } from '../form/Field'
import { PhotoPicker, type Photo } from '../form/PhotoPicker'
import { StepFooter } from './StepFooter'
import type { BuildingDraft } from './draft'

const BUILDING_TYPES = ['상가건물', '단독건물', '빌라/연립', '주상복합', '단독주택', '오피스텔']

type BuildingInfoStepProps = {
  value: BuildingDraft
  onChange: (patch: Partial<BuildingDraft>) => void
  /** 사진은 File 이라 임시 저장에 담기지 않고 등록 화면이 들고 있는다. */
  photos: Photo[]
  onAddPhotos: (files: File[]) => void
  onRemovePhoto: (index: number) => void
  onMakePhotoPrimary: (index: number) => void
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
  onPrev,
  onNext,
}: BuildingInfoStepProps) {
  const filled =
    value.buildingType !== '' &&
    value.totalFloors.trim() !== '' &&
    value.operatingFloors.trim() !== '' &&
    value.hasParking !== null &&
    value.hasElevator !== null &&
    photos.length > 0

  return (
    <>
      <main className="flex w-full flex-1 flex-col items-center px-6 py-14">
        <div className="flex w-full max-w-[980px] flex-col gap-8">
          <h1 className="text-[32px] leading-6 font-bold text-[#242424]">건물 정보를 입력해주세요.</h1>

          <div className="flex w-full flex-col gap-8">
            <Field label="건물 형태">
              <ChipGroup>
                {BUILDING_TYPES.map((type) => (
                  <Chip
                    key={type}
                    selected={value.buildingType === type}
                    onClick={() => onChange({ buildingType: type })}
                  >
                    {type}
                  </Chip>
                ))}
              </ChipGroup>
            </Field>

            <div className="flex w-full gap-[50px]">
              <div className="min-w-0 flex-1">
                <Field label="총 층수">
                  <input
                    value={value.totalFloors}
                    onChange={(event) => onChange({ totalFloors: event.target.value })}
                    placeholder="예: 8층"
                    className={inputClass + ' font-medium'}
                  />
                </Field>
              </div>
              <div className="min-w-0 flex-1">
                <Field label="지점 운영층">
                  <input
                    value={value.operatingFloors}
                    onChange={(event) => onChange({ operatingFloors: event.target.value })}
                    placeholder="예: 2~4층"
                    className={inputClass + ' font-medium'}
                  />
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
              />
            </Field>
          </div>
        </div>
      </main>

      <StepFooter step={2} onPrev={onPrev} onNext={onNext} nextDisabled={!filled} />
    </>
  )
}
