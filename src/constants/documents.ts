/**
 * 약관 · 방침 문서 링크.
 *
 * Kohere iOS 앱이 쓰는 노션 페이지와 같은 주소다. 앱은
 * `Presentation/More/Setting/SettingDocumentWebFeature.swift` 와
 * `Presentation/Login/Components/TermsDetailView.swift` 에서 이 셋을 연다.
 * 문서가 바뀌면 앱과 웹 양쪽을 같이 고쳐야 한다.
 *
 * 임차인 앱의 매물 신청에는 별도 문서 두 개(개인정보 수집·이용, 제3자 제공)가 더 있는데
 * 임대인 웹 흐름에는 해당하지 않아 넣지 않았다.
 */
export const DOCUMENT_URLS = {
  termsOfService:
    'https://jewel-humor-b3e.notion.site/39777dadb98580ad9a47eda58626c047?source=copy_link',
  privacyPolicy:
    'https://jewel-humor-b3e.notion.site/39777dadb9858039b2aedef03251cdf4?source=copy_link',
  marketing:
    'https://jewel-humor-b3e.notion.site/39077dadb985802ba1a8ffb0472238e4?source=copy_link',
} as const
