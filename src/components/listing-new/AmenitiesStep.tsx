import { Chip, ChipGroup } from '../form/Chip'
import { Field } from '../form/Field'
import { StepFooter } from './StepFooter'
import { StepTitle } from './StepTitle'
import { StepBody } from './StepBody'
import {
  FACILITY_GROUPS,
  FACILITY_NONE,
  facilityKey,
  selectedCodes,
  type FacilityGroupKey,
} from './facilities'

type AmenitiesStepProps = {
  /** 「그룹키:코드」 목록. 제출할 때 그룹별로 갈라 담는다. */
  value: string[]
  onChange: (next: string[]) => void
  onPrev: () => void
  onNext: () => void
}

/**
 * 매물 등록 4단계 — 편의 시설.
 *
 * 여덟 그룹 모두 최소 하나를 골라야 한다. 해당 시설이 아예 없는 건물도 있으므로 「없음」이
 * 그 자리를 맡는다 — 서버도 같은 규칙이라, 없으면 `["NONE"]` 하나만 보내야 하고 다른
 * 코드와 섞으면 400 이다. 그래서 화면에서도 「없음」과 나머지를 서로 밀어낸다.
 */
export function AmenitiesStep({ value, onChange, onPrev, onNext }: AmenitiesStepProps) {
  /** 「없음」을 고르면 그 그룹의 나머지를 지우고, 다른 걸 고르면 「없음」을 지운다. */
  function toggle(group: FacilityGroupKey, code: string) {
    const key = facilityKey(group, code)

    if (value.includes(key)) {
      onChange(value.filter((item) => item !== key))
      return
    }

    const others = value.filter((item) => !item.startsWith(`${group}:`))
    const kept =
      code === FACILITY_NONE
        ? others
        : [...others, ...selectedCodes(value, group)
            .filter((picked) => picked !== FACILITY_NONE)
            .map((picked) => facilityKey(group, picked))]

    onChange([...kept, key])
  }

  const filled = FACILITY_GROUPS.every((group) => selectedCodes(value, group.key).length > 0)

  return (
    <>
      <StepBody>
        <div className="flex w-full max-w-[980px] flex-col gap-8">
          <StepTitle>숙소에 갖춰진 편의 시설을 선택해주세요.</StepTitle>

          <div className="flex w-full flex-col gap-6">
            {FACILITY_GROUPS.map((group) => {
              const picked = selectedCodes(value, group.key)

              return (
                <Field key={group.key} label={group.label}>
                  <ChipGroup>
                    {/* 시안대로 「없음」이 맨 앞이다. */}
                    <Chip
                      selected={picked.includes(FACILITY_NONE)}
                      onClick={() => toggle(group.key, FACILITY_NONE)}
                    >
                      없음
                    </Chip>

                    {group.items.map((item) => (
                      <Chip
                        key={item.code}
                        selected={picked.includes(item.code)}
                        onClick={() => toggle(group.key, item.code)}
                      >
                        {item.label}
                      </Chip>
                    ))}
                  </ChipGroup>
                </Field>
              )
            })}
          </div>
        </div>
      </StepBody>

      <StepFooter step={4} onPrev={onPrev} onNext={onNext} nextDisabled={!filled} />
    </>
  )
}
