import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Modal } from '../Modal'
import { inputClass } from '../form/Field'
import { ctaDisabledClass, ctaPrimaryClass } from '../form/CtaButton'

/**
 * 검색 결과에서 한 건을 고르는 팝업.
 *
 * 주소와 인근 역이 성격이 같아 함께 쓴다 — 검색어를 받아 후보를 나열하고, 고른 한 건을
 * 가공 없이 그대로 돌려준다. 서버가 준 값을 우리가 다듬으면 그대로 매물 데이터가 되므로
 * 여기서는 표시만 하고 값은 손대지 않는다.
 *
 * 팝업 껍데기는 로그인 · 회원가입에서 쓰던 것을 그대로 쓴다(시안 224:30671 기준 577px).
 * 목록 자체는 시안이 없어 기존 입력칸 · 버튼 토큰에 맞춰 짰다.
 */
export type CandidateDialogProps<T> = {
  open: boolean
  onClose: () => void
  title: string
  /** 검색칸 안내 문구. 주소는 건물번호까지 필요해서 화면마다 다르다. */
  placeholder: string
  /** 검색어 없이 처음부터 보여줄 목록 (인근 역). 없으면 검색을 해야 결과가 나온다. */
  initialItems?: T[]
  /**
   * initialItems 위에 붙는 머리말 (예: 「추천 · 주변 역」).
   *
   * 목록이 이미 채워져 있으면 그게 전부인 줄 알고 검색칸을 지나친다. 이건 추천일 뿐이고
   * 직접 찾을 수도 있다는 걸 알려 주는 자리다. 검색을 한 번 하면 사라진다.
   */
  initialLabel?: string
  /** 목록이 비었을 때 보여줄 안내. 검색 전 · 검색 후 문구가 다르다. */
  emptyHint: ReactNode
  onSearch: (keyword: string) => Promise<T[]>
  onSelect: (item: T) => void
  /** 한 줄에 그릴 내용. 값 가공 없이 서버가 준 문자열을 그대로 넣는다. */
  renderItem: (item: T) => { primary: string; secondary?: string; trailing?: string }
  keyOf: (item: T, index: number) => string
}

export function CandidateDialog<T>({
  open,
  onClose,
  title,
  placeholder,
  initialItems,
  initialLabel,
  emptyHint,
  onSearch,
  onSelect,
  renderItem,
  keyOf,
}: CandidateDialogProps<T>) {
  const [keyword, setKeyword] = useState('')
  const [items, setItems] = useState<T[]>(initialItems ?? [])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** 한 번이라도 검색했는지. 「결과 없음」과 「아직 안 찾음」을 갈라야 한다. */
  const [searched, setSearched] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  // 열릴 때마다 처음 상태로 되돌린다. 이전에 찾던 것이 남아 있으면 헷갈린다.
  useEffect(() => {
    if (!open) return
    setKeyword('')
    setItems(initialItems ?? [])
    setError(null)
    setSearched(false)
    inputRef.current?.focus()
    // initialItems 는 호출부에서 새로 만들어 넘기는 배열이라 의존성에 넣으면 매번 돈다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleSearch() {
    const trimmed = keyword.trim()
    if (trimmed === '' || searching) return

    setSearching(true)
    setError(null)
    try {
      setItems(await onSearch(trimmed))
      setSearched(true)
    } catch (caught) {
      setItems([])
      setSearched(true)
      setError(caught instanceof Error ? caught.message : '검색에 실패했습니다.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} label={title}>
      <div className="flex w-full flex-col gap-4">
        <h2 className="text-cool-neutral-50 w-full text-center text-2xl leading-[1.6] font-bold">
          {title}
        </h2>

        <div className="flex w-full items-center gap-2">
          <input
            ref={inputRef}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            // 팝업 안이라 form 이 없다. 엔터로도 찾을 수 있게 직접 받는다.
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleSearch()
              }
            }}
            placeholder={placeholder}
            aria-label={title}
            className={`${inputClass} min-w-0 flex-1 font-medium`}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={keyword.trim() === '' || searching}
            className={
              (keyword.trim() === '' || searching ? ctaDisabledClass : ctaPrimaryClass) +
              ' h-14 w-[88px] shrink-0'
            }
          >
            {searching ? '…' : '검색'}
          </button>
        </div>

        {/* 검색 전에 띄운 목록은 추천이라는 걸 밝힌다. 한 번 검색하면 그 결과로 바뀐다. */}
        {!searched && initialLabel && items.length > 0 && (
          <span className="text-cool-neutral-40 px-3 text-xs leading-4 font-medium">
            {initialLabel}
          </span>
        )}

        {/* 목록은 길어질 수 있어 팝업 안에서만 스크롤한다. */}
        <ul className="flex max-h-[320px] w-full flex-col overflow-y-auto">
          {items.map((item, index) => {
            const row = renderItem(item)
            return (
              <li key={keyOf(item, index)}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="hover:bg-cool-neutral-5 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-cool-neutral-80 truncate text-base leading-6 font-medium">
                      {row.primary}
                    </span>
                    {row.secondary && (
                      <span className="text-cool-neutral-40 truncate text-sm leading-5">
                        {row.secondary}
                      </span>
                    )}
                  </span>
                  {row.trailing && (
                    <span className="text-cool-neutral-40 shrink-0 text-sm leading-5">
                      {row.trailing}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        {items.length === 0 && (
          <p
            role={error ? 'alert' : undefined}
            className={
              'w-full px-3 text-center text-sm leading-5 ' +
              (error ? 'text-red-600' : 'text-cool-neutral-40')
            }
          >
            {error ?? (searched ? emptyHint : '검색어를 입력해 주세요.')}
          </p>
        )}
      </div>
    </Modal>
  )
}
