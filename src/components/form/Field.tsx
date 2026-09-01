import type { ReactNode } from 'react'

/*
 * 디자인 시스템 「입력 필드 Input Field」의 상태들.
 *
 * | 상태 | 배경 | 테두리 | 글자 |
 * | default | white | gray/300 | placeholder cool-neutral/10 |
 * | hover | cool-neutral/5 | neutral/30 | 그대로 |
 * | active · on-change (포커스) | white | primary/50 | 값 cool-neutral/70 |
 * | completed (값 있음) | white | neutral/10 | 값 cool-neutral/70 |
 * | error | status/red/5 | status/red/50 | 값 cool-neutral/70 |
 * | disabled | cool-neutral/7 | 없음 | cool-neutral/10 |
 *
 * 글자 굵기는 문서상 SemiBold 인데 매물 등록 화면 시안은 Medium 으로 그려져 있어
 * 호출부에서 붙인다. 어느 쪽이 맞는지는 디자이너 확인이 필요하다.
 */
const inputShape =
  'h-14 w-full rounded-2xl border px-4 text-lg leading-6 outline-none transition-colors ' +
  'placeholder:text-cool-neutral-10 ' +
  'disabled:border-transparent disabled:bg-cool-neutral-7 disabled:text-cool-neutral-10'

/** 기본 입력 상자. hover · 포커스 · 값 채워짐 · 비활성까지 상태가 들어 있다. */
export const inputClass =
  inputShape +
  ' border-gray-300 bg-white text-cool-neutral-70 not-placeholder-shown:border-neutral-10 ' +
  'hover:border-neutral-30 hover:bg-cool-neutral-5 focus:border-primary-50 focus:bg-white'

/** 오류 상태. 값이 잘못됐을 때 inputClass 대신 쓴다. */
export const inputErrorClass =
  inputShape + ' border-status-red-50 bg-status-red-5 text-cool-neutral-70'

/**
 * 입력칸 바로 아래에 붙는 오류 문구 (시안 224:31092).
 *
 * 폼 맨 아래에 모아 두면 어느 칸이 문제인지 알 수 없다. 특히 회원가입처럼 긴 폼에서는
 * 문구가 화면 밖 칸을 가리키게 된다. 그래서 칸마다 그 아래에 붙인다.
 */
export function FieldError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-status-red-50 px-2 text-xs leading-4">
      {children}
    </p>
  )
}

/**
 * 체크박스 (시안 224:29572 — 16px, 테두리 neutral/30, 모서리 2px).
 *
 * 브라우저 기본 체크박스는 테두리와 모서리를 CSS 로 못 바꾼다. 운영체제가 직접 그리기
 * 때문이다. 그래서 진짜 input 은 숨겨 두고(접근성·키보드는 그대로) 네모는 직접 그린다.
 */
export function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <span className="relative flex size-4 shrink-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        // 화면 밖으로 보내는 sr-only 방식은 긴 내부 스크롤에서 포커스될 때 Chrome이
        // 숨은 input 위치로 스크롤을 당길 수 있다. 보이는 상자 위에 투명하게 겹친다.
        className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0"
      />
      {/*
        체크 표시 색을 상자에서 물려준다(currentColor). peer-checked 는 형제에만 걸려서
        상자 안쪽 아이콘에 직접 줄 수 없기 때문이다. 꺼져 있으면 투명이라 안 보인다.
      */}
      <span
        aria-hidden
        className="border-neutral-30 peer-focus-visible:ring-primary-40 peer-checked:border-primary-40 peer-checked:bg-primary-40 flex size-full items-center justify-center rounded-[2px] border bg-white text-transparent transition-colors peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1"
      >
        <svg viewBox="0 0 16 16" className="size-3">
          <path
            d="M3.5 8.5l3 3 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  )
}

type FieldProps = {
  label: string
  /** 라벨 오른쪽 빨간 별표 (필수 입력 표시) */
  required?: boolean
  /** 라벨 행 오른쪽 끝에 붙는 요소 */
  labelEnd?: ReactNode
  /** 라벨과 내용 사이 간격. 사진 묶음처럼 8px 인 화면이 있어 열어 둔다. */
  gap?: string
  children: ReactNode
}

/** 라벨 + 입력 묶음. 시안의 라벨(18px semibold #505050)과 4px 간격을 따른다. */
export function Field({ label, required, labelEnd, gap = 'gap-1', children }: FieldProps) {
  return (
    <div className={'flex w-full flex-col ' + gap}>
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
