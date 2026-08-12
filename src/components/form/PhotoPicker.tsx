import { useEffect, useState } from 'react'
import plusUrl from '../../assets/icon-plus-small.svg'

export const PHOTO_MAX = 5

/** 앱 목록에서 쓰는 비율. 미리보기와 크게 보기가 같은 값을 쓴다. */
const APP_RATIO = 4 / 3

/** 업로드 API 가 없어서 브라우저 안에서만 미리보기를 만든다. url 은 objectURL 이다. */
export type Photo = { url: string; file: File }

/*
 * 사진 위 버튼은 마우스를 올렸을 때만 보인다. 작은 썸네일이라 늘 띄우면 지저분하다.
 * 숨기는 데 opacity 를 쓰는 이유는 키보드로 탭 이동해도 잡히게 하려는 것이고,
 * 마우스가 없는 기기에서는 사진을 눌러 크게 보기 창에서 같은 일을 할 수 있다.
 */
const overlayControlClass =
  'absolute cursor-pointer opacity-0 transition-opacity group-hover:opacity-100 ' +
  'group-focus-within:opacity-100 focus-visible:opacity-100'

type PhotoPickerProps = {
  photos: Photo[]
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
  /** 고른 사진을 맨 앞으로 보낸다. 첫 장이 대표 사진이다. */
  onMakePrimary: (index: number) => void
}

/** 사진 미리보기 줄 + 안내 문구. 라벨은 쓰는 쪽에서 Field 로 감싼다. */
export function PhotoPicker({ photos, onAdd, onRemove, onMakePrimary }: PhotoPickerProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const preview = previewIndex === null ? null : photos[previewIndex]

  return (
    <>
      <div className="flex w-full flex-wrap gap-3">
        {photos.map((photo, index) => (
          <div key={photo.url} className="group relative h-[90px] w-[120px] shrink-0">
            <button
              type="button"
              onClick={() => setPreviewIndex(index)}
              aria-label={`${index + 1}번째 사진 크게 보기`}
              className="block size-full cursor-pointer"
            >
              <img src={photo.url} alt="" className="size-full rounded-2xl object-cover" />
            </button>

            {index === 0 ? (
              <span className="bg-label-normal/75 absolute top-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-[10px] leading-4 font-semibold text-white">
                대표
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onMakePrimary(index)}
                className={overlayControlClass + ' bg-label-normal/75 bottom-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-[10px] leading-4 font-semibold text-white'}
              >
                대표로 지정
              </button>
            )}

            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`${index + 1}번째 사진 삭제`}
              className={overlayControlClass + ' bg-label-normal/70 hover:bg-label-normal top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full text-white'}
            >
              <CloseIcon />
            </button>
          </div>
        ))}

        {photos.length < PHOTO_MAX && (
          <label className="border-cool-neutral-8 flex h-[90px] w-[120px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-dashed px-[18px] py-2.5">
            <div className="flex flex-col items-center justify-center pt-1.5">
              <img src={plusUrl} alt="" className="size-4" />
              <span className="text-cool-neutral-70 text-xs leading-6 font-medium">사진 추가</span>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                /*
                 * FileList 는 입력창에 붙어 있어서 value 를 비우면 같이 비워진다.
                 * 상태 갱신이 나중에 읽으면 빈 목록이 되므로 여기서 배열로 옮겨 넘긴다.
                 */
                onAdd(Array.from(event.target.files ?? []))
                // 같은 파일을 다시 고를 수 있도록 값을 비운다.
                event.target.value = ''
              }}
              className="hidden"
            />
          </label>
        )}
      </div>

      <span className="text-cool-neutral-30 text-xs leading-6 font-medium">
        이미지 파일만 최대 {PHOTO_MAX}장・ 4:3 비율로 잘려요
      </span>

      {preview && previewIndex !== null && (
        <PhotoPreview
          photo={preview}
          isPrimary={previewIndex === 0}
          onClose={() => setPreviewIndex(null)}
          onRemove={() => {
            onRemove(previewIndex)
            setPreviewIndex(null)
          }}
          onMakePrimary={() => {
            onMakePrimary(previewIndex)
            setPreviewIndex(0)
          }}
        />
      )}
    </>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
      <path
        d="M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

const PREVIEW_MAX_W = 720
const PREVIEW_MAX_H = 520

type PhotoPreviewProps = {
  photo: Photo
  isPrimary: boolean
  onClose: () => void
  onRemove: () => void
  onMakePrimary: () => void
}

/**
 * 원본 전체를 크게 보여주고, 앱에서 잘려 나가는 바깥쪽을 어둡게 덮는다.
 * 밝은 부분이 실제로 목록에 보이는 영역이다.
 */
function PhotoPreview({ photo, isPrimary, onClose, onRemove, onMakePrimary }: PhotoPreviewProps) {
  // 그려진 크기를 알아야 잘리는 영역을 계산할 수 있어서 불러온 뒤에 잡는다.
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const crop = size
    ? size.width / size.height > APP_RATIO
      ? { width: size.height * APP_RATIO, height: size.height }
      : { width: size.width, height: size.width / APP_RATIO }
    : null

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="사진 크게 보기"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full flex-col items-center gap-4 overflow-auto rounded-2xl bg-white p-6"
      >
        <div className="relative overflow-hidden rounded-xl" style={size ?? undefined}>
          <img
            src={photo.url}
            alt=""
            onLoad={(event) => {
              const image = event.currentTarget
              const scale = Math.min(
                PREVIEW_MAX_W / image.naturalWidth,
                PREVIEW_MAX_H / image.naturalHeight,
                1,
              )
              setSize({
                width: image.naturalWidth * scale,
                height: image.naturalHeight * scale,
              })
            }}
            className="block"
            style={size ?? { maxWidth: PREVIEW_MAX_W, maxHeight: PREVIEW_MAX_H }}
          />
          {size && crop && (
            <div
              aria-hidden
              className="pointer-events-none absolute"
              style={{
                width: crop.width,
                height: crop.height,
                left: (size.width - crop.width) / 2,
                top: (size.height - crop.height) / 2,
                // 바깥쪽 전체를 덮는 그림자로 잘리는 영역을 어둡게 만든다.
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
              }}
            />
          )}
        </div>

        <p className="text-cool-neutral-30 text-xs leading-6 font-medium">
          밝은 부분만 앱에 보여요. 어두운 부분은 4:3으로 잘립니다.
        </p>

        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={onRemove}
            className="text-cool-neutral-50 cursor-pointer text-base leading-6 font-semibold"
          >
            사진 삭제
          </button>
          <div className="flex items-center gap-2">
            {!isPrimary && (
              <button
                type="button"
                onClick={onMakePrimary}
                className="border-line-normal text-neutral-70 flex h-10 cursor-pointer items-center rounded-xl border px-4 text-base leading-6 font-semibold"
              >
                대표로 지정
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="bg-label-normal flex h-10 cursor-pointer items-center rounded-xl px-4 text-base leading-6 font-semibold text-white transition-colors hover:brightness-125"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
