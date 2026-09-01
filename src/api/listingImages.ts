import { ApiError, api } from './client'

/**
 * 매물 사진 업로드. 등록 폼에서 고른 사진을 **한 장씩** 올린다.
 *
 * 매물을 만들지는 않는다 — 저장 위치(key)와 미리보기 주소(url)만 돌려주고, 그 key 를 모아
 * 매물 등록(POST /api/v2/listings)의 imageKeys · roomOffers[].roomImageKeys 에 담는다.
 *
 * 올린 사진은 아직 어느 매물의 것도 아니다. **7일 안에 등록해야** 하고 참조되지 않으면
 * 자동으로 지워진다. 폼에서 뺀 사진은 등록 요청에 담지 않으면 그만이라 삭제 API 가 없다.
 */
const UPLOAD_PATH = '/api/v2/listings/images'

/*
 * 서버가 받는 형식은 jpeg · png · webp · heic 네 가지지만 시안 문구대로 jpg · png 만 받는다.
 *
 * HEIC 는 넣더라도 안 된다 — 서버가 **형식을 변환하지 않아서** HEIC 로 저장되는데
 * 브라우저는 HEIC 를 그리지 못한다. 임대인 미리보기부터 깨지고 세입자 화면에서도 안 보인다.
 * webp 는 브라우저가 잘 그리므로 열어도 되지만, 그건 시안을 고칠 일이지 우리가 정할 게 아니다.
 */
export const IMAGE_ACCEPT = 'image/jpeg,image/png'

export type UploadedImage = {
  /** 등록 요청에 담을 저장 위치. */
  key: string
  /**
   * 미리보기 주소.
   *
   * 등록이 끝나면 서버가 사진을 확정 위치로 옮기므로 **이 주소는 곧 무효가 된다.**
   * 그 뒤로는 등록 응답의 imageUrls · roomImageUrls 를 쓴다.
   */
  url: string
}

/**
 * 사진 한 장을 올린다.
 *
 * signal 을 넘기면 도중에 끊을 수 있다. 사용자가 올리는 중인 사진을 지웠을 때 쓴다 —
 * 끊지 않으면 아무도 안 쓸 사진이 서버에 올라가고 대역폭도 계속 나간다.
 */
export function uploadListingImage(file: File, signal?: AbortSignal): Promise<UploadedImage> {
  const body = new FormData()
  // part 이름은 file 하나뿐이다.
  body.append('file', file)
  return api.post<UploadedImage>(UPLOAD_PATH, body, { signal })
}

/**
 * 아예 받을 수 없는 파일인지. 걸리면 목록에 넣지 않고 문구로만 알린다.
 *
 * 용량은 여기서 보지 않는다 — 올리기 전에 긴 변 1920px 로 줄이므로 10MB 를 넘길 일이
 * 거의 없고, 그래도 넘으면 서버가 413 으로 잡는다. 미리 막으면 줄이면 됐을 사진까지
 * 거절하게 된다.
 */
export function imageRejectReason(file: File): string | null {
  if (!IMAGE_ACCEPT.split(',').includes(file.type)) return 'JPG · PNG 만 올릴 수 있어요'
  return null
}

/**
 * 업로드 실패 문구. 사진마다 따로 보여준다 — 한 장 실패로 나머지를 다시 올릴 이유가 없다.
 *
 * 이 문구가 뜰 때 그 사진은 이미 목록에서 빠져 있다(자동 재시도까지 실패한 뒤다).
 * 화면에 누를 것이 없으므로 「다시 시도」가 아니라 「다시 올려 달라」고 해야 맞다.
 */
export function uploadErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '사진을 올리지 못했어요. 다시 올려 주세요'
  }

  switch (error.code) {
    case 'LISTING_IMAGE_TOO_LARGE':
      return '10MB 이하 사진만 올릴 수 있어요'

    case 'LISTING_IMAGE_UNSUPPORTED_TYPE':
      return 'JPG · PNG 만 올릴 수 있어요'

    case 'LISTING_IMAGE_REQUIRED':
      return '내용이 없는 파일이에요'

    case 'FORBIDDEN':
    case 'AUTH_ONBOARDING_REQUIRED':
      return '임대인 계정으로 온보딩을 마쳐야 사진을 올릴 수 있어요'

    // 저장소 쪽 문제라 잠시 뒤면 풀린다.
    case 'UPSTREAM_ERROR':
      return '사진 저장에 실패했어요. 잠시 후 다시 올려 주세요'

    default:
      return '사진을 올리지 못했어요. 다시 올려 주세요'
  }
}
