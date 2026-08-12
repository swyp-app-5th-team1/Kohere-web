import { Chip, ChipGroup } from '../form/Chip'
import { Field, inputClass } from '../form/Field'
import { StepFooter } from './StepFooter'
import type { ConditionsDraft } from './draft'

const GENDER_RULES = ['성별 무관', '남성 전용', '여성 전용', '남녀 구역 분리']
const LANGUAGES = ['영어', '중국어', '일본어']
const ARC_RULES = ['필수', '여권으로 대체 가능']
const TEXT_MAX = 500

/** 라벨 오른쪽에 붙는 글자 수 표시. */
function Counter({ length }: { length: number }) {
  return (
    <span className="text-label-neutral text-sm leading-5 font-medium">
      {length} / {TEXT_MAX}
    </span>
  )
}

const textareaClass =
  'h-[100px] w-full resize-none rounded-2xl border border-gray-300 bg-white p-4 text-lg leading-6 ' +
  'font-medium outline-none transition-colors placeholder:text-cool-neutral-10 focus:border-cool-neutral-50'

type ConditionsStepProps = {
  value: ConditionsDraft
  onChange: (patch: Partial<ConditionsDraft>) => void
  onPrev: () => void
  onNext: () => void
}

/** 매물 등록 3단계 — 입주조건. 외국어 응대만 중복 선택이다. */
export function ConditionsStep({ value, onChange, onPrev, onNext }: ConditionsStepProps) {
  const toggleLanguage = (language: string) => {
    onChange({
      languages: value.languages.includes(language)
        ? value.languages.filter((item) => item !== language)
        : [...value.languages, language],
    })
  }

  const filled =
    value.genderRule !== '' &&
    value.languages.length > 0 &&
    value.arcRule !== '' &&
    value.ageRange.trim() !== '' &&
    value.houseRule.trim() !== '' &&
    value.refundPolicy.trim() !== ''

  return (
    <>
      <main className="flex w-full flex-1 flex-col items-center px-6 py-14">
        <div className="flex w-full max-w-[980px] flex-col gap-8">
          <h1 className="text-[32px] leading-6 font-bold text-[#242424]">
            숙소의 입주조건을 선택해주세요.
          </h1>

          <div className="flex w-full flex-col gap-6">
            <Field label="성별 구분">
              <ChipGroup>
                {GENDER_RULES.map((rule) => (
                  <Chip
                    key={rule}
                    selected={value.genderRule === rule}
                    onClick={() => onChange({ genderRule: rule })}
                  >
                    {rule}
                  </Chip>
                ))}
              </ChipGroup>
            </Field>

            <Field label="외국어 응대 (중복가능)">
              <ChipGroup>
                {LANGUAGES.map((language) => (
                  <Chip
                    key={language}
                    selected={value.languages.includes(language)}
                    onClick={() => toggleLanguage(language)}
                  >
                    {language}
                  </Chip>
                ))}
              </ChipGroup>
            </Field>

            <Field label="외국인 등록증(ARC) 필요 여부">
              <ChipGroup>
                {ARC_RULES.map((rule) => (
                  <Chip
                    key={rule}
                    selected={value.arcRule === rule}
                    onClick={() => onChange({ arcRule: rule })}
                  >
                    {rule}
                  </Chip>
                ))}
              </ChipGroup>
            </Field>

            <Field label="이용 연령대">
              <input
                value={value.ageRange}
                onChange={(event) => onChange({ ageRange: event.target.value })}
                placeholder="예: 20~40세"
                className={inputClass + ' font-medium'}
              />
            </Field>

            {/* 안내 문구는 시안에 "임주자가" 로 적혀 있는데 오타로 보여 바로잡았다. */}
            <Field label="이용조건" labelEnd={<Counter length={value.houseRule.length} />}>
              <textarea
                value={value.houseRule}
                onChange={(event) => onChange({ houseRule: event.target.value })}
                maxLength={TEXT_MAX}
                placeholder="입주자가 지켜야 할 규칙을 적어주세요"
                className={textareaClass}
              />
            </Field>

            <Field label="환불정책" labelEnd={<Counter length={value.refundPolicy.length} />}>
              <textarea
                value={value.refundPolicy}
                onChange={(event) => onChange({ refundPolicy: event.target.value })}
                maxLength={TEXT_MAX}
                placeholder="중도 퇴실 시 환불 규정을 적어주세요"
                className={textareaClass}
              />
            </Field>
          </div>
        </div>
      </main>

      <StepFooter step={3} onPrev={onPrev} onNext={onNext} nextDisabled={!filled} />
    </>
  )
}
