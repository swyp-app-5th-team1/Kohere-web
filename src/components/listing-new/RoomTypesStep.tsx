import { Chip, ChipGroup } from '../form/Chip'
import { Field } from '../form/Field'
import { PhotoPicker, type Photo } from '../form/PhotoPicker'
import { TextField } from '../form/TextField'
import { StepFooter } from './StepFooter'
import { StepTitle } from './StepTitle'
import { createRoomType, type RoomTypeDraft } from './draft'
import chevronUrl from '../../assets/icon-chevron-down.svg'
import plusUrl from '../../assets/icon-plus.svg'
import trashUrl from '../../assets/icon-trash.svg'

const ROOM_OPTIONS = [
  '전입신고 가능',
  '개인 화장실/개인 욕실',
  '2인실',
  '식사 제공',
  '즉시 입주',
  '영어 소통 가능',
  '여성 전용',
  '관리비 없음',
]

/** 객실 사진은 시안이 2장 이상을 요구한다. */
const ROOM_PHOTO_MIN = 2

const cardClass = 'w-full rounded-2xl border-[1.5px] border-gray-300'

/** 방 이름을 아직 안 적었으면 A 타입 · B 타입 … 으로 부른다. */
function roomTypeLabel(room: RoomTypeDraft, index: number) {
  return room.name.trim() || `${String.fromCharCode(65 + index)} 타입`
}

type RoomTypesStepProps = {
  value: RoomTypeDraft[]
  onChange: (next: RoomTypeDraft[]) => void
  /** 펼쳐진 방 타입의 id. 하나만 펼친다. */
  expandedId: string | null
  onExpandedChange: (id: string | null) => void
  photos: Record<string, Photo[]>
  onAddPhotos: (roomId: string, files: File[]) => void
  onRemovePhoto: (roomId: string, index: number) => void
  onMakePhotoPrimary: (roomId: string, index: number) => void
  onMovePhoto: (roomId: string, from: number, to: number) => void
  photoFailures: Record<string, { name: string; reason: string }[]>
  onPrev: () => void
  onNext: () => void
}

/** 매물 등록 5단계 — 방 타입과 가격. 타입을 여러 개 만들고 하나씩 펼쳐서 채운다. */
export function RoomTypesStep({
  value,
  onChange,
  expandedId,
  onExpandedChange,
  photos,
  onAddPhotos,
  onRemovePhoto,
  onMakePhotoPrimary,
  onMovePhoto,
  photoFailures,
  onPrev,
  onNext,
}: RoomTypesStepProps) {
  const patchRoom = (id: string, values: Partial<RoomTypeDraft>) => {
    onChange(value.map((room) => (room.id === id ? { ...room, ...values } : room)))
  }

  const addRoom = () => {
    const room = createRoomType()
    onChange([...value, room])
    onExpandedChange(room.id)
  }

  const removeRoom = (id: string) => {
    onChange(value.filter((room) => room.id !== id))
    if (expandedId === id) onExpandedChange(null)
  }

  const toggleOption = (room: RoomTypeDraft, option: string) => {
    patchRoom(room.id, {
      options: room.options.includes(option)
        ? room.options.filter((item) => item !== option)
        : [...room.options, option],
    })
  }

  const filled = value.every(
    (room) =>
      room.name.trim() !== '' &&
      room.deposit.trim() !== '' &&
      room.maintenanceFee.trim() !== '' &&
      room.monthlyRent.trim() !== '' &&
      room.minPeriod.trim() !== '' &&
      room.maxPeriod.trim() !== '' &&
      room.options.length > 0 &&
      (photos[room.id]?.length ?? 0) >= ROOM_PHOTO_MIN,
  )

  return (
    <>
      <main className="flex w-full flex-1 flex-col items-center px-6 py-14">
        <div className="flex w-full max-w-[980px] flex-col gap-8">
          <StepTitle>각 방과 가격 정보를 입력해주세요.</StepTitle>

          <div className="flex w-full flex-col gap-6">
            {value.map((room, index) => {
              const expanded = room.id === expandedId
              const roomPhotos = photos[room.id] ?? []

              const actions = (
                <div className="flex shrink-0 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => removeRoom(room.id)}
                    disabled={value.length === 1}
                    aria-label={`${roomTypeLabel(room, index)} 삭제`}
                    className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <img src={trashUrl} alt="" className="size-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onExpandedChange(expanded ? null : room.id)}
                    aria-expanded={expanded}
                    aria-label={`${roomTypeLabel(room, index)} ${expanded ? '접기' : '펼치기'}`}
                    className="cursor-pointer"
                  >
                    <img
                      src={chevronUrl}
                      alt=""
                      className={'size-6 transition-transform ' + (expanded ? 'rotate-180' : '')}
                    />
                  </button>
                </div>
              )

              if (!expanded) {
                return (
                  <div
                    key={room.id}
                    className={cardClass + ' flex items-center justify-between px-6 py-5'}
                  >
                    <span className="text-neutral-70 px-1 text-lg leading-6 font-semibold">
                      {roomTypeLabel(room, index)}
                    </span>
                    {actions}
                  </div>
                )
              }

              return (
                <div key={room.id} className={cardClass + ' flex flex-col gap-6 px-6 py-8'}>
                  {/* 방 이름 줄만 오른쪽에 삭제·접기 버튼이 붙는다. */}
                  <div className="flex w-full items-start gap-8">
                    <div className="min-w-0 flex-1">
                      <Field label="방 이름">
                        <TextField
                          value={room.name}
                          onChange={(event) => patchRoom(room.id, { name: event.target.value })}
                          placeholder="입력"
                          className="font-medium"
                          />
                      </Field>
                    </div>
                    {actions}
                  </div>

                  <Field label="보증금">
                    <TextField
                      value={room.deposit}
                      onChange={(event) => patchRoom(room.id, { deposit: event.target.value })}
                      placeholder="입력하기"
                      className="font-medium"
                      />
                  </Field>

                  <div className="flex w-full gap-8">
                    <div className="min-w-0 flex-1">
                      <Field label="관리비">
                        <TextField
                          value={room.maintenanceFee}
                          onChange={(event) =>
                            patchRoom(room.id, { maintenanceFee: event.target.value })
                          }
                          placeholder="입력하기"
                          className="font-medium"
                          />
                      </Field>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Field label="월세">
                        <TextField
                          value={room.monthlyRent}
                          onChange={(event) =>
                            patchRoom(room.id, { monthlyRent: event.target.value })
                          }
                          placeholder="입력하기"
                          className="font-medium"
                          />
                      </Field>
                    </div>
                  </div>

                  <div className="flex w-full items-end gap-2.5">
                    <div className="min-w-0 flex-1">
                      <Field label="이용기간">
                        <TextField
                          value={room.minPeriod}
                          onChange={(event) => patchRoom(room.id, { minPeriod: event.target.value })}
                          placeholder="최소"
                          className="font-medium"
                          />
                      </Field>
                    </div>
                    <span className="text-neutral-70 flex h-14 shrink-0 items-center text-lg leading-6">
                      ~
                    </span>
                    <div className="min-w-0 flex-1">
                      {/* 오른쪽 칸은 라벨이 없지만 시안에서 높이를 맞춰 두었다. */}
                      <div className="flex w-full flex-col gap-1">
                        <div className="h-6" aria-hidden />
                        <TextField
                          value={room.maxPeriod}
                          onChange={(event) => patchRoom(room.id, { maxPeriod: event.target.value })}
                          placeholder="최대"
                          aria-label="이용기간 최대"
                          className="font-medium"
                          />
                      </div>
                    </div>
                  </div>

                  <Field label="각 방 타입별 옵션">
                    <ChipGroup>
                      {ROOM_OPTIONS.map((option) => (
                        <Chip
                          key={option}
                          selected={room.options.includes(option)}
                          onClick={() => toggleOption(room, option)}
                        >
                          {option}
                        </Chip>
                      ))}
                    </ChipGroup>
                  </Field>

                  <Field label={`객실 사진 (${ROOM_PHOTO_MIN}장 이상)`} gap="gap-2">
                    <PhotoPicker
                      photos={roomPhotos}
                      onAdd={(files) => onAddPhotos(room.id, files)}
                      onRemove={(index) => onRemovePhoto(room.id, index)}
                      onMakePrimary={(index) => onMakePhotoPrimary(room.id, index)}
                      onMove={(from, to) => onMovePhoto(room.id, from, to)}
                      failures={photoFailures[room.id] ?? []}
                    />
                  </Field>
                </div>
              )
            })}

            <button
              type="button"
              onClick={addRoom}
              className="bg-secondary-5 border-cool-neutral-8 flex w-full cursor-pointer items-center justify-center gap-3 rounded-3xl border-[1.5px] px-6 py-5 transition-colors hover:brightness-98"
            >
              <img src={plusUrl} alt="" className="size-6" />
              <span className="text-neutral-70 text-xl leading-6 font-semibold">객실 타입 추가</span>
            </button>
          </div>
        </div>
      </main>

      <StepFooter step={5} onPrev={onPrev} onNext={onNext} nextDisabled={!filled} />
    </>
  )
}
