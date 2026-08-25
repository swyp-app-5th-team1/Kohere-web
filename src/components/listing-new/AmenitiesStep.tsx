import { Chip, ChipGroup } from '../form/Chip'
import { Field } from '../form/Field'
import { StepFooter } from './StepFooter'
import { StepTitle } from './StepTitle'

/**
 * 시안에 그려진 순서 그대로다. "안전 시설" 과 "제공 비품" 뒤쪽에 주방 항목(토스트기 ·
 * 커피머신 · 정수기)이 다시 나오는데, 시안 그대로 옮겨 두었으니 확인이 필요하다.
 */
const AMENITY_GROUPS: { label: string; items: string[] }[] = [
  { label: '난방 시설', items: ['중앙 난방', '개별 난방'] },
  { label: '세탁 시설', items: ['세탁기', '건조기', '건조대', '다리미'] },
  {
    label: '주방 시설',
    items: [
      '공용 냉장고',
      '인덕션',
      '가스레인지',
      '전자레인지',
      '전기포트',
      '전기밥솥',
      '토스트기',
      '커피머신',
      '정수기',
    ],
  },
  {
    label: '생활 시설',
    items: ['WIFI', 'TV', '소파', '공용에어컨', '운동기구', '프로젝터', '공기청정기', '공용PC', '정수기'],
  },
  {
    label: '안전 시설',
    items: [
      'CCTV',
      '공동현관 도어락',
      '방별 도어락',
      '소화기',
      '화재경보기',
      '경비원',
      '토스트기',
      '커피머신',
      '정수기',
    ],
  },
  {
    label: '공용 공간',
    items: ['공용 주방', '공용 화장실', '공용 샤워실', '라운지', '스터디룸', '회의실', '옥상'],
  },
  {
    label: '제공 비품',
    items: ['침구류', '세탁세제', '조미료', '휴지', '수건', '전기밥솥', '토스트기', '커피머신', '정수기'],
  },
  { label: '주변 편의 시설', items: ['편의점', '공원', '마트/슈퍼마켓', '세탁소', '병원/약국'] },
]

type AmenitiesStepProps = {
  /** 같은 이름이 다른 그룹에도 있어서 "그룹명/순번/항목" 으로 구분해 담는다. */
  value: string[]
  onChange: (next: string[]) => void
  onPrev: () => void
  onNext: () => void
}

const groupKey = (groupLabel: string, index: number, item: string) =>
  `${groupLabel}/${index}/${item}`

/** 매물 등록 4단계 — 편의 시설. 모든 항목이 중복 선택이다. */
export function AmenitiesStep({ value, onChange, onPrev, onNext }: AmenitiesStepProps) {
  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key])
  }

  // 어떤 항목이 필수인지 아직 안 정해져서, 우선 그룹마다 하나씩은 고르게 해 뒀다.
  const filled = AMENITY_GROUPS.every((group) =>
    group.items.some((item, index) => value.includes(groupKey(group.label, index, item))),
  )

  return (
    <>
      <main className="flex w-full flex-1 flex-col items-center px-6 py-14">
        <div className="flex w-full max-w-[980px] flex-col gap-8">
          <StepTitle>숙소에 갖춰진 편의 시설을 선택해주세요.</StepTitle>

          <div className="flex w-full flex-col gap-6">
            {AMENITY_GROUPS.map((group) => (
              <Field key={group.label} label={group.label}>
                <ChipGroup>
                  {group.items.map((item, index) => {
                    const key = groupKey(group.label, index, item)

                    return (
                      <Chip key={key} selected={value.includes(key)} onClick={() => toggle(key)}>
                        {item}
                      </Chip>
                    )
                  })}
                </ChipGroup>
              </Field>
            ))}
          </div>
        </div>
      </main>

      <StepFooter step={4} onPrev={onPrev} onNext={onNext} nextDisabled={!filled} />
    </>
  )
}
