import { Link } from 'react-router-dom'
import { StepTitle } from './StepTitle'
import { StepBody } from './StepBody'
import checkUrl from '../../assets/icon-circle-check-large.svg'

const formatToday = () => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}.${month}.${day}`
}

type SubmittedStepProps = {
  /**
   * 서버가 발급한 매물 id. 접수 번호라는 필드가 따로 없어 이걸 그 자리에 보여 준다.
   *
   * TODO(기획 확인): 24자리 hex 라 시안의 `KH-2026-0142` 처럼 임대인이 불러 주기 어렵다.
   * 짧은 접수 번호를 서버가 따로 발급할지 정해야 한다.
   */
  receiptNo: string | null
  onRestart: () => void
}

/** 매물 등록 완료 화면. 하단 진행 표시줄과 이전/다음이 없다. */
export function SubmittedStep({ receiptNo, onRestart }: SubmittedStepProps) {
  return (
    // 시안에서 이 화면만 본문이 세로 가운데에 온다.
    <StepBody center>
      <div className="flex w-[423px] max-w-full flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-4">
          <img src={checkUrl} alt="" className="size-[100px]" />
          <StepTitle className="text-center">제출이 완료되었어요!</StepTitle>
        </div>

        <p className="text-label-alternative text-center text-base leading-6 font-semibold">
          검토 후 24시간 이내에 앱에 노출됩니다.
          <br />
          결과는 입력하신 번호로 문자 안내드립니다.
          <br />
          <br />
          누락된 정보가 있으면 담당자가 먼저 연락드릴 수 있습니다.
        </p>

        <div className="bg-secondary-10 flex w-full flex-col gap-2.5 rounded-2xl px-6 py-5 text-lg">
          <div className="flex w-full items-center justify-between pr-1">
            <span className="text-cool-neutral-50 leading-6">접수 번호</span>
            <span className="text-cool-neutral-80 leading-6 font-medium">{receiptNo ?? '-'}</span>
          </div>
          <div className="flex w-full items-center justify-between pr-1">
            <span className="text-cool-neutral-50 leading-6">제출일</span>
            <span className="text-cool-neutral-80 leading-6 font-medium">{formatToday()}</span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2.5">
          <Link
            to="/listings"
            className="bg-cool-neutral-80 border-line-alternative flex h-12 w-full items-center justify-center rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition-colors hover:brightness-125"
          >
            매물 목록으로 이동
          </Link>
          <button
            type="button"
            onClick={onRestart}
            className="text-neutral-70 flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl px-3 text-base leading-6 font-semibold"
          >
            매물 추가 등록하기
          </button>
        </div>
      </div>
    </StepBody>
  )
}
