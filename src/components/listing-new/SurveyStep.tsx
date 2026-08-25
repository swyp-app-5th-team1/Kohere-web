import { Chip } from '../form/Chip'
import { Field } from '../form/Field'
import { StepFooter } from './StepFooter'
import { StepTitle } from './StepTitle'
import type { SurveyDraft } from './draft'

const NATIONALITIES = ['일본', '미국', '중국', '동남아', '유럽']

const DIFFICULTIES = [
  '의사소통 문제(언어)',
  '외국인 생활 관련 문제(문화)',
  '낯선 외국인에 대한 두려움(신원)',
  '대금 지급, 환율(결제)',
  '손해배상, 위약금 관련(계약 이행)',
  '외국인과의 소통 채널 부족(대화나 공지 전달의 어려움)',
]

const MESSAGE_MAX = 500

const textareaClass =
  'h-[100px] w-full resize-none rounded-2xl border border-gray-300 bg-white p-4 text-lg leading-6 ' +
  'font-medium outline-none transition-colors placeholder:text-cool-neutral-10 focus:border-cool-neutral-50'

type SurveyStepProps = {
  value: SurveyDraft
  onChange: (patch: Partial<SurveyDraft>) => void
  onPrev: () => void
  onNext: () => void
}

/**
 * 매물 등록 6단계 — 추가 질문 (선택).
 *
 * 답이 하나도 없으면 버튼이 "건너뛰기" 로 바뀐다. 어느 쪽이든 다음 단계로 간다.
 */
export function SurveyStep({ value, onChange, onPrev, onNext }: SurveyStepProps) {
  const toggled = (current: string[], item: string) =>
    current.includes(item) ? current.filter((saved) => saved !== item) : [...current, item]

  const answered =
    value.nationalities.length > 0 || value.difficulties.length > 0 || value.message.trim() !== ''

  return (
    <>
      <main className="flex w-full flex-1 flex-col items-center px-6 py-14">
        <div className="flex w-full max-w-[980px] flex-col gap-8">
          <div className="flex flex-col gap-1">
            <StepTitle>추가 질문 사항 (선택)</StepTitle>
            <p className="text-cool-neutral-30 text-xs leading-6 font-medium">
              더 나은 서비스를 만들기 위한 질문입니다. 답변 내용은 임차인에게 전달되지 않습니다.
            </p>
          </div>

          <div className="flex w-full flex-col gap-6">
            <Field label="선호하는 국적">
              <div className="flex w-full flex-wrap gap-2">
                {NATIONALITIES.map((item) => (
                  <Chip
                    key={item}
                    selected={value.nationalities.includes(item)}
                    onClick={() => onChange({ nationalities: toggled(value.nationalities, item) })}
                  >
                    {item}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="외국인 임차인과 계약하는 과정에서 겪은 힘든 점, 어려운 점이 있다면 말씀해주세요.">
              {/* 시안에서 이 묶음만 칩을 세로로 쌓는다. */}
              <div className="flex w-full flex-col items-start gap-2">
                {DIFFICULTIES.map((item) => (
                  <Chip
                    key={item}
                    selected={value.difficulties.includes(item)}
                    onClick={() => onChange({ difficulties: toggled(value.difficulties, item) })}
                  >
                    {item}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field
              label="기타 필요한 서비스 혹은 Kohere에 전하고 싶은 말"
              labelEnd={
                <span className="text-label-neutral text-sm leading-5 font-medium">
                  {value.message.length} / {MESSAGE_MAX}
                </span>
              }
            >
              <textarea
                value={value.message}
                onChange={(event) => onChange({ message: event.target.value })}
                maxLength={MESSAGE_MAX}
                placeholder="자유롭게 입력해 주세요"
                className={textareaClass}
              />
            </Field>
          </div>
        </div>
      </main>

      <StepFooter step={6} onPrev={onPrev} onNext={onNext} nextLabel={answered ? '다음' : '건너뛰기'} />
    </>
  )
}
