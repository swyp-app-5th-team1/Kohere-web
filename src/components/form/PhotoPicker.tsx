import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { IMAGE_ACCEPT } from '../../api/listingImages'
import plusUrl from '../../assets/icon-plus-small.svg'

export const PHOTO_MAX = 5

/** 앱 목록에서 쓰는 비율. 미리보기와 크게 보기가 같은 값을 쓴다. */
const APP_RATIO = 16 / 9

/**
 * 폼이 들고 있는 사진 한 장.
 *
 * 고르는 즉시 서버로 올리고, 그때 받은 `key` 를 매물 등록 요청에 담는다. 올리는 중에는
 * key 가 비어 있고 url 은 브라우저가 만든 임시 주소다.
 */
export type Photo = {
  /** 목록에서 이 사진을 집어내기 위한 열쇠. 서버와 무관한 값이다. */
  id: string
  /** 미리보기 주소. 올리는 중에는 objectURL, 끝나면 서버가 준 주소. */
  url: string
  /** 업로드가 끝나야 생긴다. null 이면 아직 등록 요청에 담을 수 없다. */
  key: string | null
  /** 다시 보낼 때 필요한 원본. 임시 저장에는 담기지 않는다. */
  file?: File
}

/*
 * 사진 위 버튼은 마우스를 올렸을 때만 보인다. 작은 썸네일이라 늘 띄우면 지저분하다.
 * 숨기는 데 opacity 를 쓰는 이유는 키보드로 탭 이동해도 잡히게 하려는 것이고,
 * 마우스가 없는 기기에서는 사진을 눌러 크게 보기 창에서 같은 일을 할 수 있다.
 */
/** 파인더에서 끌어온 것인지. 우리가 시작한 순서 드래그는 'text/plain' 만 싣는다. */
const isFileDrag = (event: { dataTransfer: DataTransfer }) =>
  Array.from(event.dataTransfer.types).includes('Files')

/** 아직 서버에 올라가는 중인가. 끝내 실패한 사진은 목록에 남지 않는다. */
const uploading = (photo: Photo) => photo.key === null

const overlayControlClass =
  'absolute cursor-pointer opacity-0 transition-opacity group-hover:opacity-100 ' +
  'group-focus-within:opacity-100 focus-visible:opacity-100'

type PhotoPickerProps = {
  photos: Photo[]
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
  /** 고른 사진을 맨 앞으로 보낸다. 첫 장이 대표 사진이다. */
  onMakePrimary: (index: number) => void
  /**
   * 사진을 다른 자리로 옮긴다 (시안 「자유롭게 옮겨 순서를 지정해주세요」).
   *
   * 순서가 그냥 보기 좋으라고 있는 게 아니다 — 등록 요청의 `imageKeys` 는 보낸 순서를
   * 그대로 유지하고 **첫 값이 카드 · 상세의 대표 이미지**가 된다.
   */
  onMove: (from: number, to: number) => void
  /**
   * 목록에 넣지 못한 파일들.
   *
   * 형식이 안 맞아 아예 못 보낸 것과, 보냈지만 끝내 실패한 것이 함께 온다. 어느 쪽이든
   * 목록에 자리를 잡으면 다섯 칸 중 한 칸을 못 쓰게 되므로 넣지 않고 이유만 적는다.
   */
  failures: { name: string; reason: string }[]
}

/** 사진 미리보기 줄 + 안내 문구. 라벨은 쓰는 쪽에서 Field 로 감싼다. */
export function PhotoPicker({
  photos,
  onAdd,
  onRemove,
  onMakePrimary,
  onMove,
  failures,
}: PhotoPickerProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const preview = previewIndex === null ? null : photos[previewIndex]

  /** 파인더에서 파일을 끌어와 상자 위에 올려둔 상태. */
  const [fileOver, setFileOver] = useState(false)

  /** 집어 든 사진과 지금 올려둔 자리. 끌기가 끝나면 둘 다 비운다. */
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  function endDrag() {
    setDragFrom(null)
    setDragOver(null)
  }

  /*
   * 마우스 없이도 옮길 수 있게 좌우 화살표를 받는다. HTML 끌어놓기는 키보드로 쓸 수
   * 없어서, 이게 없으면 순서 바꾸기가 마우스 전용 기능이 된다.
   */
  function handleArrow(event: ReactKeyboardEvent<HTMLElement>, index: number) {
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
    if (step === 0) return

    const target = index + step
    if (target < 0 || target >= photos.length) return

    event.preventDefault()
    onMove(index, target)
  }

  return (
    <>
      {/*
        파일 드롭과 순서 바꾸기가 같은 이벤트로 들어온다. 끌어온 곳이 파인더면
        dataTransfer.types 에 'Files' 가 있고, 우리가 시작한 순서 드래그면 'text/plain' 이다.
        가르지 않고 두면 파일을 떨궜을 때 브라우저가 그 이미지를 탭에서 열어서 폼이 통째로
        날아간다 — 놓을 수 있는 자리로 인정받으려면 dragOver 에서 preventDefault 가 필요하다.
      */}
      <div
        className={
          'flex w-full flex-wrap gap-3 rounded-2xl transition-colors ' +
          (fileOver ? 'bg-primary-5 outline-primary-40 outline-2 outline-dashed' : '')
        }
        onDragOver={(event) => {
          if (!isFileDrag(event)) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
          setFileOver(true)
        }}
        onDragLeave={(event) => {
          // 자식 사이를 지나갈 때도 leave 가 뜬다. 상자 밖으로 나갔을 때만 끈다.
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFileOver(false)
        }}
        onDrop={(event) => {
          if (!isFileDrag(event)) return
          event.preventDefault()
          setFileOver(false)
          onAdd(Array.from(event.dataTransfer.files))
        }}
      >
        {/* 시안대로 추가 칸이 맨 앞이다. 대표는 그 다음, 즉 사진 중 첫 장이다. */}
        {photos.length < PHOTO_MAX && (
          <label className="border-cool-neutral-8 flex h-[90px] w-[160px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-dashed px-[18px] py-2.5">
            <div className="flex flex-col items-center justify-center pt-1.5">
              <img src={plusUrl} alt="" className="size-4" />
              <span className="text-cool-neutral-70 text-xs leading-6 font-medium">사진 추가</span>
            </div>
            <input
              type="file"
              // HEIC 는 서버가 받지만 브라우저가 못 그린다. accept 이유는 IMAGE_ACCEPT 참고.
              accept={IMAGE_ACCEPT}
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

        {photos.map((photo, index) => (
          <div
            key={photo.id}
            draggable={!uploading(photo)}
            onDragStart={(event) => {
              setDragFrom(index)
              // 이 값을 읽지는 않지만, 비워 두면 파이어폭스가 끌기를 시작하지 않는다.
              event.dataTransfer.setData('text/plain', String(index))
              event.dataTransfer.effectAllowed = 'move'
            }}
            // 파일 드롭은 바깥 상자가 맡는다. 여기서는 순서 바꾸기만 본다.
            onDragOver={(event) => {
              if (dragFrom === null || isFileDrag(event)) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              setDragOver(index)
            }}
            onDrop={(event) => {
              if (isFileDrag(event)) return
              event.preventDefault()
              if (dragFrom !== null && dragFrom !== index) onMove(dragFrom, index)
              endDrag()
            }}
            onDragEnd={endDrag}
            className={
              'group relative h-[90px] w-[160px] shrink-0 transition-opacity ' +
              (dragFrom === index ? 'opacity-40' : '') +
              // 끌고 온 사진이 들어갈 자리를 테두리로 알린다.
              (dragOver === index && dragFrom !== index
                ? ' ring-primary-40 rounded-2xl ring-2 ring-offset-2'
                : '')
            }
          >
            <button
              type="button"
              onClick={() => setPreviewIndex(index)}
              onKeyDown={(event) => handleArrow(event, index)}
              aria-label={`${index + 1}번째 사진 크게 보기. 좌우 화살표로 순서를 옮길 수 있습니다`}
              className="block size-full cursor-pointer"
            >
              {/*
                이미지는 브라우저가 알아서 끌 수 있게 해 두는데, 그러면 바깥 상자 대신
                이미지가 끌려서 순서 바꾸기가 안 된다. 그래서 이미지 쪽만 막는다.
              */}
              <img
                src={photo.url}
                alt=""
                draggable={false}
                className="size-full rounded-2xl object-cover"
              />
            </button>

            {/*
              올리는 중에는 덮개가 클릭까지 막는다(pointer-events 를 살려 둔다). 아직 key 가
              없어서 크게 보기 · 대표 지정이 의미가 없고, 끝나면 사진이 바뀌기 때문이다.
              삭제만은 덮개 위에 남겨 둔다 — 업로드가 멎었을 때 빠져나갈 길이 있어야 한다.
              실패는 화면에 상태를 만들지 않는다. 한 번 더 자동으로 보내 보고 그래도 안 되면
              목록에서 빼고 아래에 이유만 적는다 — 누를 것을 남기지 않는 편이 단순하다.
            */}
            {uploading(photo) && (
              <span
                role="status"
                aria-label="사진 올리는 중"
                className="bg-label-normal/45 absolute inset-0 flex cursor-wait items-center justify-center rounded-2xl"
              >
                <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              </span>
            )}
            {/*
              여기 오는 실패는 전송 쪽 문제뿐이라 다시 시도가 의미가 있다. 다만 한 번 더
              해도 안 되면 같은 이유일 가능성이 크니 지우도록 안내한다.

              지우기를 이 덮개 안에 두는 이유가 있다 — 첫 번째 사진은 대표 배지가 자리를
              차지해 오른쪽 위 삭제 버튼이 없다. 덮개 밖에 맡기면 그 사진만 못 지운다.
            */}
            {index === 0 ? (
              /*
               * 대표 사진에는 삭제 버튼을 두지 않는다. 사진은 최소 한 장이 있어야 하고,
               * 대표를 지우려면 다른 사진을 대표로 올린 뒤 지우는 게 순서다.
               */
              <span className="text-cool-neutral-5 absolute top-1.5 left-1.5 rounded-[20px] bg-black/30 px-2.5 text-xs leading-6 font-medium">
                대표
              </span>
            ) : (
              <>
                {!uploading(photo) && (
                <button
                  type="button"
                  onClick={() => onMakePrimary(index)}
                  className={
                    overlayControlClass +
                    ' bg-label-normal/75 bottom-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-[10px] leading-4 font-semibold text-white'
                  }
                >
                  대표로 지정
                </button>
                )}

                {/* 삭제는 늘 보인다. 지우려는 사람이 사진 위를 훑어보게 만들 이유가 없다. */}
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  aria-label={`${index + 1}번째 사진 삭제`}
                  className="bg-label-normal/70 hover:bg-label-normal absolute top-1.5 right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full text-white transition-colors"
                >
                  <CloseIcon />
                </button>
              </>
            )}
          </div>
        ))}

      </div>

      {/* 시안 문구 그대로. 시안의 4:3 만 16:9 로 바꿨다 — 썸네일이 그렇게 그려져 있다. */}
      <span className="text-cool-neutral-30 text-xs leading-6 font-medium">
        png, jpg 파일만 최대 {PHOTO_MAX}장 첨부가능・ 16:9 비율로 잘려요
      </span>
      {/*
        실패 사유는 아래에 적는다. 160x90 짜리 썸네일 안에 문장을 넣으면 줄이 깨져서 읽을
        수가 없다. 셀에는 눌러야 할 것(다시 시도 · 지우기)만 남긴다.
      */}
      {failures.map((item, index) => (
        <span key={index} role="alert" className="text-status-red-50 text-xs leading-6">
          {item.name} — {item.reason}
        </span>
      ))}

      {/*
        시안 문구 그대로. 첫 장이 대표라는 건 사진에 붙는 「대표」 배지가 이미 보여준다.
        한 장뿐이면 옮길 데가 없어 띄우지 않는다.
      */}
      {photos.length > 1 && (
        <span className="text-cool-neutral-30 text-xs leading-6 font-medium">
          자유롭게 옮겨 순서를 지정해주세요
        </span>
      )}

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
          밝은 부분만 앱에 보여요. 어두운 부분은 16:9로 잘립니다.
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
