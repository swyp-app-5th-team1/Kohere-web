import type { ReactNode } from 'react'

/**
 * 디자인 시스템의 기본 입력 상자 스타일 (h56 · r16 · gray-300 테두리).
 * 글자 굵기는 화면마다 달라서(로그인 semibold, 회원가입 medium) 호출부에서 붙인다.
 */
export const inputClass =
  'h-14 w-full rounded-2xl border border-gray-300 bg-white px-4 text-lg leading-6 ' +
  'outline-none transition-colors placeholder:text-cool-neutral-10 focus:border-cool-neutral-50'

type FieldProps = {
  label: string
  /** 라벨 오른쪽 빨간 별표 (필수 입력 표시) */
  required?: boolean
  /** 라벨 행 오른쪽 끝에 붙는 요소 */
  labelEnd?: ReactNode
  children: ReactNode
}

/** 라벨 + 입력 묶음. 시안의 라벨(18px semibold #505050)과 4px 간격을 따른다. */
export function Field({ label, required, labelEnd, children }: FieldProps) {
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center gap-2.5 px-1">
        <span className="text-neutral-70 flex-1 text-lg leading-6 font-semibold">
          {label}
          {required && <span className="ml-2.5 text-sm leading-5 text-red-500">*</span>}
        </span>
        {labelEnd}
      </div>
      {children}
    </div>
  )
}
