/**
 * 다음(카카오) 우편번호 서비스.
 *
 * 키 발급이나 서버 작업 없이 스크립트만 불러오면 되고, 국내 주소 입력의 사실상 표준이라
 * 이걸 쓴다. 좌표(위경도)는 주지 않는다 — 지도에 찍어야 한다면 별도 지오코딩이 필요하다.
 */

const SCRIPT_SRC = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

/** 우편번호 창이 돌려주는 값 중 우리가 쓰는 것만. */
type DaumPostcodeData = {
  zonecode: string
  roadAddress: string
  jibunAddress: string
  /** 도로명을 고르면 jibunAddress 가 비고 이쪽에 지번이 담긴다. */
  autoJibunAddress: string
  buildingName: string
}

type DaumPostcode = {
  new (options: { oncomplete: (data: DaumPostcodeData) => void }): { open: () => void }
}

declare global {
  interface Window {
    daum?: { Postcode: DaumPostcode }
  }
}

export type PostcodeResult = {
  /** 5자리 우편번호 */
  postalCode: string
  /**
   * 도로명 주소. 도로명이 부여되지 않은 곳은 빈 문자열이다.
   *
   * 이 값을 등록에 그대로 싣지는 않는다 — 좌표와 짝을 맞추려고 주소 검색 API 를 한 번 더
   * 부르고, 거기서 받은 표준 주소를 담는다. 여기 값은 검색어와 후보 대조에만 쓴다.
   */
  roadAddress: string
  /** 지번 주소. 후보가 여럿일 때 어느 것이 맞는지 가르는 데 쓴다. */
  jibunAddress: string
  /** 참고용 건물명. 상세 주소를 채울 때 힌트로 쓸 수 있다. */
  buildingName: string
}

/** 주소 검색 API 에 보낼 검색어. 도로명이 없으면 지번으로라도 찾아본다. */
export const postcodeKeyword = (result: PostcodeResult) =>
  result.roadAddress || result.jibunAddress

let loading: Promise<void> | null = null

/**
 * 스크립트를 미리 받아 둔다. 화면이 열릴 때 불러 두면 버튼을 눌렀을 때 곧바로 창이 뜬다.
 *
 * 미리 받아 두는 이유가 있다. 클릭한 뒤에 스크립트를 받으면 그 사이에 사용자 조작 맥락이
 * 끊겨서 브라우저가 팝업을 막아 버린다.
 */
export function preloadPostcodeScript(): Promise<void> {
  if (window.daum?.Postcode) return Promise.resolve()

  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        loading = null
        reject(new Error('우편번호 스크립트를 불러오지 못했습니다'))
      }
      document.head.appendChild(script)
    })
  }

  return loading
}

/**
 * 우편번호 검색 창을 연다. 고르지 않고 닫으면 onComplete 가 불리지 않는다.
 *
 * 스크립트가 준비돼 있으면 곧바로(동기로) 연다. 아직이면 받아서 열지만, 그때는 팝업이
 * 막힐 수 있어 onBlocked 로 알린다.
 */
export function openPostcodeSearch(
  onComplete: (result: PostcodeResult) => void,
  onBlocked?: () => void,
): void {
  const open = () => {
    new window.daum!.Postcode({
      oncomplete: (data) => {
        onComplete({
          postalCode: data.zonecode,
          roadAddress: data.roadAddress,
          // 도로명을 고르면 jibunAddress 가 비고 autoJibunAddress 에 들어온다.
          jibunAddress: data.jibunAddress || data.autoJibunAddress,
          buildingName: data.buildingName,
        })
      },
    }).open()
  }

  if (window.daum?.Postcode) {
    open()
    return
  }

  preloadPostcodeScript().then(open).catch(onBlocked)
}
