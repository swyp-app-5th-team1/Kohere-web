import { Chip, ChipGroup } from '../form/Chip'
import { Field, FieldError } from '../form/Field'
import { PhotoPicker, type Photo } from '../form/PhotoPicker'
import { useTouched } from '../form/useTouched'
import { TextField } from '../form/TextField'
import { StepFooter } from './StepFooter'
import { StepTitle } from './StepTitle'
import { StepBody } from './StepBody'
import {
  digitsOnly,
  moneyError,
  parseMoney,
  parseMonths,
  stayError,
  stayMaxError,
} from './amounts'
import { ROOM_FILTER_TAGS } from './catalogs'
import { createRoomType, type RoomTypeDraft } from './draft'
import chevronUrl from '../../assets/icon-chevron-down.svg'
import plusUrl from '../../assets/icon-plus.svg'
import trashUrl from '../../assets/icon-trash.svg'

/** 객실 사진은 시안이 2장 이상을 요구한다. */
const ROOM_PHOTO_MIN = 2

const cardClass = 'w-full rounded-2xl border-[1.5px] border-gray-300'

/** 방 이름을 아직 안 적었으면 A 타입 · B 타입 … 으로 부른다. */
function roomTypeLabel(room: RoomTypeDraft, index: number) {
  return room.name.trim() || `${String.fromCharCode(65 + index)} 타입`
}

/**
 * 방 한 줄에서 서버로 보낼 숫자를 읽어 낸다.
 *
 * 칸이 숫자만 받으니 대개 그대로 읽힌다. 오류는 칸을 거치지 않고 들어온 값(임시 저장에서
 * 되살린 옛 draft)이나 0 개월 · 최대 < 최소 를 잡는 안전망이다. 하나라도 걸리면 다음으로
 * 못 넘어간다(amounts.ts 참고).
 */
function readRoom(room: RoomTypeDraft) {
  const minStay = parseMonths(room.minPeriod)

  return {
    deposit: parseMoney(room.deposit),
    maintenanceFee: parseMoney(room.maintenanceFee),
    monthlyRent: parseMoney(room.monthlyRent),
    minStay,
    maxStay: parseMonths(room.maxPeriod),
    errors: {
      deposit: moneyError(room.deposit),
      maintenanceFee: moneyError(room.maintenanceFee),
      monthlyRent: moneyError(room.monthlyRent),
      minStay: stayError(room.minPeriod),
      maxStay: stayMaxError(room.maxPeriod, minStay),
    },
  }
}

type RoomTypesStepProps = {
  value: RoomTypeDraft[]
  onChange: (next: RoomTypeDraft[]) => void
  /** 수정 모드에서 기존 방을 배열에서 버리지 않고 INACTIVE 요청으로 보존한다. */
  onRemoveRoom?: (room: RoomTypeDraft) => void
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
  onRemoveRoom,
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
  /* 방이 여럿이라 방 id 를 열쇠에 섞는다. */
  const touched = useTouched()

  const patchRoom = (id: string, values: Partial<RoomTypeDraft>) => {
    onChange(value.map((room) => (room.id === id ? { ...room, ...values } : room)))
  }

  const addRoom = () => {
    const room = createRoomType()
    onChange([...value, room])
    onExpandedChange(room.id)
  }

  const removeRoom = (id: string) => {
    const room = value.find((item) => item.id === id)
    if (room) onRemoveRoom?.(room)
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

  /* 채워졌는지만 보지 않는다 — 읽어 낼 수 있는 모양인지까지 봐야 서버에서 400 이 안 난다. */
  const filled = value.every((room) => {
    const read = readRoom(room)

    return (
      room.name.trim() !== '' &&
      read.deposit !== null &&
      read.maintenanceFee !== null &&
      read.monthlyRent !== null &&
      read.minStay !== null &&
      read.maxStay !== null &&
      Object.values(read.errors).every((error) => error === null) &&
      room.options.length > 0 &&
      (photos[room.id]?.length ?? 0) >= ROOM_PHOTO_MIN
    )
  })

  return (
    <>
      <StepBody>
        <div className="flex w-full max-w-[980px] flex-col gap-8">
          <StepTitle>각 방과 가격 정보를 입력해주세요.</StepTitle>

          <div className="flex w-full flex-col gap-6">
            {value.map((room, index) => {
              const expanded = room.id === expandedId
              const roomPhotos = photos[room.id] ?? []
              const read = readRoom(room)

              /* 다음 버튼은 read.errors 로 잠그고, 빨간 문구는 다녀간 칸에만 그린다. */
              const shown = (field: keyof typeof read.errors) =>
                touched.error(`${room.id}:${field}`, read.errors[field])

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

                  {/*
                    금액 세 칸과 이용기간 두 칸은 숫자만 쳐진다 — 한글도 「만원」도 안
                    들어간다(amounts.ts 참고). 대신 단위를 칸 안에 붙여 둔다. 시안
                    placeholder(「입력하기」·「최소」)에는 단위가 없어서, 원 단위로 다 적어야
                    하는 것도 이용기간이 개월인 것도 알 길이 없다.
                  */}
                  <Field label="보증금">
                    <div className="flex w-full flex-col gap-1">
                      <TextField
                        value={room.deposit}
                        suffix="원"
                        inputMode="numeric"
                        error={shown('deposit') !== null}
                        onChange={(event) => patchRoom(room.id, { deposit: digitsOnly(event.target.value) })}
                        onBlur={() => touched.touch(`${room.id}:deposit`)}
                        placeholder="입력하기"
                        className="font-medium"
                      />
                      {shown('deposit') && <FieldError>{shown('deposit')}</FieldError>}
                    </div>
                  </Field>

                  <div className="flex w-full items-start gap-8">
                    <div className="min-w-0 flex-1">
                      <Field
                        label="관리비"
                      >
                        <div className="flex w-full flex-col gap-1">
                          <TextField
                            value={room.maintenanceFee}
                            suffix="원"
                            inputMode="numeric"
                            error={shown('maintenanceFee') !== null}
                            onChange={(event) =>
                              patchRoom(room.id, { maintenanceFee: digitsOnly(event.target.value) })
                            }
                            onBlur={() => touched.touch(`${room.id}:maintenanceFee`)}
                            placeholder="입력하기"
                            className="font-medium"
                          />
                          {shown('maintenanceFee') && <FieldError>{shown('maintenanceFee')}</FieldError>}
                        </div>
                      </Field>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Field
                        label="월세"
                      >
                        <div className="flex w-full flex-col gap-1">
                          <TextField
                            value={room.monthlyRent}
                            suffix="원"
                            inputMode="numeric"
                            error={shown('monthlyRent') !== null}
                            onChange={(event) =>
                              patchRoom(room.id, { monthlyRent: digitsOnly(event.target.value) })
                            }
                            onBlur={() => touched.touch(`${room.id}:monthlyRent`)}
                            placeholder="입력하기"
                            className="font-medium"
                          />
                          {shown('monthlyRent') && <FieldError>{shown('monthlyRent')}</FieldError>}
                        </div>
                      </Field>
                    </div>
                  </div>

                  {/*
                    이용기간의 단위는 **개월**이다 (`minStayMonths` · `maxStayMonths`).
                    라벨이 왼쪽 칸에만 붙는 시안이라 두 칸을 한 Field 안에 넣었다.
                  */}
                  <Field
                    label="이용기간"
                  >
                    <div className="flex w-full flex-col gap-1">
                      <div className="flex w-full items-center gap-2.5">
                        <div className="min-w-0 flex-1">
                          <TextField
                            value={room.minPeriod}
                            suffix="개월"
                            inputMode="numeric"
                            error={shown('minStay') !== null}
                            onChange={(event) =>
                              patchRoom(room.id, { minPeriod: digitsOnly(event.target.value) })
                            }
                            onBlur={() => touched.touch(`${room.id}:minStay`)}
                            placeholder="최소"
                            aria-label="이용기간 최소"
                            className="font-medium"
                          />
                        </div>
                        <span className="text-neutral-70 shrink-0 text-lg leading-6">~</span>
                        <div className="min-w-0 flex-1">
                          <TextField
                            value={room.maxPeriod}
                            suffix="개월"
                            inputMode="numeric"
                            error={shown('maxStay') !== null}
                            onChange={(event) =>
                              patchRoom(room.id, { maxPeriod: digitsOnly(event.target.value) })
                            }
                            onBlur={() => touched.touch(`${room.id}:maxStay`)}
                            placeholder="최대"
                            aria-label="이용기간 최대"
                            className="font-medium"
                          />
                        </div>
                      </div>
                      {shown('minStay') && <FieldError>{shown('minStay')}</FieldError>}
                      {shown('maxStay') && <FieldError>{shown('maxStay')}</FieldError>}
                    </div>
                  </Field>

                  <Field label="각 방 타입별 옵션">
                    <ChipGroup>
                      {ROOM_FILTER_TAGS.map((item) => (
                        <Chip
                          key={item.code}
                          selected={room.options.includes(item.code)}
                          onClick={() => toggleOption(room, item.code)}
                        >
                          {item.label}
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
      </StepBody>

      <StepFooter step={5} onPrev={onPrev} onNext={onNext} nextDisabled={!filled} />
    </>
  )
}
