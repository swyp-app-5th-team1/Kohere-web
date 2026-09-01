type LoadingIndicatorProps = {
  /** 아이콘 크기. 버튼 안에서는 16px가 기본이다. */
  className?: string
}

/**
 * 웹에는 iOS의 UIActivityIndicatorView와 같은 공통 네이티브 뷰가 없어 CSS로 그린다.
 * 문구는 그대로 유지하고 현재 글자색을 물려받아 어느 버튼에도 함께 쓸 수 있다.
 */
export function LoadingIndicator({ className = 'size-4' }: LoadingIndicatorProps) {
  return (
    <span
      aria-hidden="true"
      className={`${className} shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent`}
    />
  )
}
