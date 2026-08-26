/*
 * 올리기 전에 사진을 줄인다.
 *
 * 폰 사진은 4000×3000 쯤 되는데 매물 화면이 쓰는 폭은 그보다 훨씬 작다. 원본을 그대로
 * 올리면 쓰지도 않을 픽셀을 전송하고, 서버 제한(장당 10MB)에도 걸린다.
 */

/** 긴 변 기준. 상세 화면 풀폭에도 충분하고 고해상도 화면에서도 뭉개지지 않는다. */
const MAX_EDGE = 1920

/** 다시 인코딩할 때의 화질. 0.85 면 눈으로는 차이를 못 느끼면서 용량이 크게 준다. */
const QUALITY = 0.85

/**
 * 긴 변이 1920px 을 넘으면 줄여서 새 파일을 만든다. 이미 작으면 원본을 그대로 돌려준다.
 *
 * `imageOrientation: 'from-image'` 가 핵심이다. 폰 사진은 센서 방향이 고정이라 픽셀이
 * 누운 채 저장되고 「돌려서 봐라」는 회전 정보가 파일 안에 따로 붙는다. 캔버스로 다시
 * 그리면 픽셀만 복사되고 그 정보는 안 따라와서, 세로로 찍은 사진이 가로로 눕는다.
 * 이 옵션을 주면 비트맵을 만들 때 회전을 이미 적용해 주므로 그대로 그려도 똑바로 선다.
 *
 * 실패하면 원본을 돌려준다 — 줄이지 못했다고 사진을 못 올리게 할 이유는 없다.
 * 그때는 서버가 크기와 형식을 다시 판단한다.
 */
export async function downscaleImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

    const scale = MAX_EDGE / Math.max(bitmap.width, bitmap.height)
    if (scale >= 1) {
      bitmap.close()
      return file
    }

    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    /*
     * PNG 를 PNG 로 다시 뽑으면 사진에서는 오히려 커진다. 줄이는 게 목적이라 JPEG 로
     * 통일한다 — 서버가 받는 두 형식 중 하나이고, 사진에는 이쪽이 맞다.
     */
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    )
    if (!blob) return file

    // 줄였는데 더 커졌다면 원본이 낫다.
    if (blob.size >= file.size) return file

    return new File([blob], toJpegName(file.name), {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    })
  } catch {
    return file
  }
}

const toJpegName = (name: string) => name.replace(/\.[^.]+$/, '') + '.jpg'
