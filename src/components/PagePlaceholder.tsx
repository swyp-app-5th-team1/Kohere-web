type Props = {
  title: string
  note?: string
}

/** 화면 구현 전 자리 표시용. 각 페이지가 완성되면 지운다. */
export function PagePlaceholder({ title, note }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      {note && <p className="mt-2 text-sm text-slate-500">{note}</p>}
    </div>
  )
}
