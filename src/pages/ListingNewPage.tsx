import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { ResumeDraftDialog } from '../components/listing-new/ResumeDraftDialog'
import { ListingUpdateConfirmDialog } from '../components/listing-new/ListingUpdateConfirmDialog'
import { PHOTO_MAX, type Photo } from '../components/form/PhotoPicker'
import {
  imageRejectReason,
  uploadErrorMessage,
  uploadListingImage,
} from '../api/listingImages'
import {
  createErrorMessage,
  createListing,
  editableListingErrorMessage,
  fetchEditableListing,
  updateListing,
  updateListingErrorMessage,
  type MyListingStatus,
} from '../api/listings'
import { downscaleImage } from '../lib/downscaleImage'
import {
  buildListingRequest,
  buildListingUpdateRequest,
} from '../components/listing-new/submit'
import { editableListingToForm } from '../components/listing-new/edit'
import { AmenitiesStep } from '../components/listing-new/AmenitiesStep'
import { BranchInfoStep } from '../components/listing-new/BranchInfoStep'
import { BuildingInfoStep } from '../components/listing-new/BuildingInfoStep'
import { ConditionsStep } from '../components/listing-new/ConditionsStep'
import { ContactStep } from '../components/listing-new/ContactStep'
import { ReviewStep } from '../components/listing-new/ReviewStep'
import { RoomTypesStep } from '../components/listing-new/RoomTypesStep'
import { SpaceTypeStep } from '../components/listing-new/SpaceTypeStep'
import { SubmittedStep } from '../components/listing-new/SubmittedStep'
import { SurveyStep } from '../components/listing-new/SurveyStep'
import {
  clearDraft,
  emptyDraft,
  hasSavedDraft,
  loadDraft,
  saveDraft,
  type ListingDraft,
  type StoredPhoto,
} from '../components/listing-new/draft'

/**
 * 매물 등록 화면. 입력값을 한곳에 모아 두고 단계별 화면을 갈아 끼운다.
 *
 * 헤더는 모든 단계가 같아서 여기서 한 번만 그리고, 본문과 하단(진행 표시줄 · 이전/다음)은
 * 단계마다 달라 각 단계 컴포넌트가 StepFooter 로 직접 그린다.
 * 매물 유형 선택은 진행 표시줄에 없는 앞 단계라 0 번이고, 표시줄은 지점 정보부터 1/7 로 센다.
 *
 * 임시 저장은 "다음" 을 누르는 순간에만 한다. 뒤로 갔다 와도 값이 남는 건 화면 상태 덕이고,
 * 새로고침 후 살아나는 건 마지막으로 다음을 누른 시점까지다.
 */
/** 사진을 받는 두 단계. 만료된 사진이 있으면 여기로 되돌린다. */
const BUILDING_STEP = 2
const ROOM_STEP = 5

/** 이 탭에서 등록 화면을 쓰는 중이라는 표시. 새로고침과 「다시 들어옴」을 가른다. */
const WRITING_FLAG = 'kohere.listingNewWriting'

/** 저장해 둔 사진을 화면 상태로 되돌린다. File 이 없어 다시 보내기는 안 된다. */
const restorePhoto = (photo: StoredPhoto): Photo => ({ ...photo })

/**
 * 그 주소에 사진이 아직 있는지 본다.
 *
 * 올린 사진은 7일 안에 등록하지 않으면 서버가 지운다. 임시 저장을 오래 묵히면 key 와
 * 주소는 남아 있는데 파일이 없어서, 화면에는 빈 칸이 뜨고 제출하면 400 이 난다.
 * fetch 대신 Image 를 쓰는 이유는 다른 도메인(CDN)이라 CORS 없이 확인하려는 것이다.
 */
const imageAlive = (url: string) =>
  new Promise<boolean>((resolve) => {
    const image = new Image()
    image.onload = () => resolve(true)
    image.onerror = () => resolve(false)
    image.src = url
  })

/** 올리기를 마친 사진만 저장 대상이다. */
const toStored = (list: Photo[]): StoredPhoto[] =>
  list
    .filter((photo): photo is Photo & { key: string } => photo.key !== null)
    .map(({ id, url, key }) => ({ id, url, key }))

const toStoredMap = (map: Record<string, Photo[]>): Record<string, StoredPhoto[]> =>
  Object.fromEntries(
    Object.entries(map)
      .map(([roomId, list]) => [roomId, toStored(list)] as const)
      .filter(([, list]) => list.length > 0),
  )

export default function ListingNewPage() {
  const { listingId } = useParams()
  const navigate = useNavigate()
  const editing = listingId !== undefined

  /*
   * 임시 저장이 있으면 이어서 할지 먼저 묻는다 (시안 팝업).
   *
   * 단, 작성 중 새로고침에는 묻지 않는다 — 방금까지 쓰던 사람에게 물으면 이상하다.
   * 「이 탭에서 작성 중이었다」는 표시를 sessionStorage 에 남겨 구분한다. 같은 탭의
   * 새로고침에는 남아 있고, 다른 화면으로 떠나면 지우며, 탭을 닫으면 브라우저가 지운다.
   */
  const [resumeAsk, setResumeAsk] = useState(
    () => !editing && hasSavedDraft() && sessionStorage.getItem(WRITING_FLAG) === null,
  )
  /* 선택하기 전에는 저장본을 화면에 올리지 않는다. 팝업 뒤에는 새 등록 첫 화면이 보여야 한다. */
  const [draft, setDraft] = useState<ListingDraft>(() =>
    editing || resumeAsk ? emptyDraft() : loadDraft(),
  )
  useEffect(() => {
    if (editing) return
    sessionStorage.setItem(WRITING_FLAG, '1')
    return () => sessionStorage.removeItem(WRITING_FLAG)
  }, [editing])
  /*
   * 사진은 올리고 나면 key · url 만 남아 임시 저장에 담긴다. 화면 상태에는 올리는 중인
   * 사진과 실패한 사진도 함께 두는데, 그것들은 저장 대상이 아니다.
   */
  const [photos, setPhotos] = useState<Photo[]>(() => draft.branchPhotos.map(restorePhoto))
  const [roomPhotos, setRoomPhotos] = useState<Record<string, Photo[]>>(() =>
    Object.fromEntries(
      Object.entries(draft.roomPhotos).map(([roomId, list]) => [roomId, list.map(restorePhoto)]),
    ),
  )
  /** 저장본을 실제로 화면에 올린 횟수. 그때마다 저장된 사진의 만료 여부를 한 번 확인한다. */
  const [restoreGeneration, setRestoreGeneration] = useState(() =>
    editing || resumeAsk ? 0 : 1,
  )
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null)
  const [inactiveRooms, setInactiveRooms] = useState<ListingDraft['roomTypes']>([])
  const [originalStatus, setOriginalStatus] = useState<MyListingStatus | null>(null)
  const [editLoading, setEditLoading] = useState(editing)
  const [editLoadError, setEditLoadError] = useState<string | null>(null)
  const [editReload, setEditReload] = useState(0)
  const [updateConfirm, setUpdateConfirm] = useState(false)

  /** 수정 모드는 브라우저 초안이 아니라 서버의 전용 상세 한 건으로만 시작한다. */
  useEffect(() => {
    if (!editing || listingId === undefined) return

    const controller = new AbortController()
    setEditLoading(true)
    setEditLoadError(null)

    fetchEditableListing(listingId, controller.signal)
      .then((detail) => {
        if (detail.status !== 'PUBLISHED' && detail.status !== 'REJECTED') {
          setEditLoadError('현재 심사 중인 매물은 수정할 수 없습니다.')
          return
        }

        const form = editableListingToForm(detail)
        setDraft(form.draft)
        setPhotos(form.branchPhotos.map(restorePhoto))
        setRoomPhotos(
          Object.fromEntries(
            Object.entries(form.roomPhotos).map(([roomId, list]) => [
              roomId,
              list.map(restorePhoto),
            ]),
          ),
        )
        setInactiveRooms(form.inactiveRooms)
        setOriginalStatus(detail.status)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setEditLoadError(editableListingErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setEditLoading(false)
      })

    return () => controller.abort()
  }, [editReload, editing, listingId])

  /*
   * 되살린 사진이 아직 서버에 있는지 확인하고, 사라진 것은 목록에서 뺀다.
   *
   * 7일이 지나면 서버가 지우는데 그때 화면에는 빈 칸만 남는다. 미리 걸러 두면 사진 칸이
   * 비어 「1장 이상」 조건에 걸리므로, 사용자는 제출 단계가 아니라 지금 다시 올리게 된다.
   */
  useEffect(() => {
    if (editing || restoreGeneration === 0) return

    let cancelled = false

    const prune = async (list: Photo[]) => {
      const alive = await Promise.all(list.map((photo) => imageAlive(photo.url)))
      return { kept: list.filter((_, i) => alive[i]), lost: alive.filter((ok) => !ok).length }
    }

    void (async () => {
      const branch = await prune(photos)
      const rooms = await Promise.all(
        Object.entries(roomPhotos).map(async ([roomId, list]) => [roomId, await prune(list)] as const),
      )
      if (cancelled) return

      const lost = branch.lost + rooms.reduce((sum, [, r]) => sum + r.lost, 0)
      if (lost === 0) return

      const keptRooms = Object.fromEntries(rooms.map(([roomId, r]) => [roomId, r.kept]))
      setPhotos(branch.kept)
      setRoomPhotos(keptRooms)

      const notice = {
        name: `저장해 둔 사진 ${lost}장`,
        reason: '기간이 지나 사라졌어요. 다시 올려 주세요',
      }
      if (branch.lost > 0) setFailures((current) => [...current, notice])
      rooms.forEach(([roomId, r]) => {
        if (r.lost > 0) setRoomFailures((current) => ({ ...current, [roomId]: [notice] }))
      })

      /*
       * 알림은 사진 칸이 있는 화면에서만 보인다. 다음 단계로 넘어간 뒤에 되살렸다면
       * 사용자는 사진이 사라진 줄도 모르고 끝까지 갔다가 제출에서 막힌다. 사진이 없으면
       * 어차피 그 단계를 다시 통과해야 하므로 거기로 되돌린다.
       */
      const target = branch.lost > 0 ? BUILDING_STEP : ROOM_STEP
      const step = Math.min(draft.step, target)
      setDraft((current) => ({ ...current, step }))
      saveDraft({
        ...draft,
        step,
        branchPhotos: toStored(branch.kept),
        roomPhotos: toStoredMap(keptRooms),
      })
    })()

    return () => {
      cancelled = true
    }
    // 저장본을 실제로 되살린 때만 본다. 그 뒤에 올린 사진은 방금 서버가 준 주소라 확인할 게 없다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, restoreGeneration])

  /*
   * 사진은 다음 버튼을 기다리지 않고 바로 저장한다. 다른 값은 다시 치면 그만이지만
   * 사진은 참조를 잃으면 파일을 다시 골라 올려야 해서 손해가 훨씬 크다.
   */
  useEffect(() => {
    if (editing) return
    const stored = { branchPhotos: toStored(photos), roomPhotos: toStoredMap(roomPhotos) }
    // 아직 아무것도 저장된 적 없고 사진도 없으면 굳이 빈 초안을 만들지 않는다.
    if (stored.branchPhotos.length === 0 && Object.keys(stored.roomPhotos).length === 0) return
    saveDraft({ ...loadDraft(), ...stored })
  }, [editing, photos, roomPhotos])

  /** 올라가는 중인 업로드. 사진을 지우거나 화면을 떠날 때 끊는다. */
  const uploads = useRef(new Map<string, AbortController>())
  useEffect(() => {
    const running = uploads.current
    return () => running.forEach((controller) => controller.abort())
  }, [])

  const createdUrls = useRef<string[]>([])
  useEffect(() => {
    // 배열을 새로 만들지 않고 push 만 하므로, 마운트 때 잡아둔 참조로 전부 해제된다.
    const urls = createdUrls.current
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  /** 등록 중에는 제출 버튼을 잠근다. 두 번 누르면 매물이 두 개 생긴다. */
  const [submitting, setSubmitting] = useState(false)
  const submitInFlight = useRef(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  /** 서버가 발급한 매물 id. 완료 화면이 접수 번호 자리에 보여 준다. */
  const [receiptNo, setReceiptNo] = useState<string | null>(null)

  /** 목록에 못 넣은 파일. 형식이 안 맞거나 끝내 올리지 못한 것들이다. */
  const [failures, setFailures] = useState<{ name: string; reason: string }[]>([])
  const [roomFailures, setRoomFailures] = useState<
    Record<string, { name: string; reason: string }[]>
  >({})

  /** 미리보기 주소는 상태 갱신 함수 밖에서 만든다. 안에서 만들면 두 번 실행돼 주소가 새어 나간다. */
  const toPhotos = (files: File[], kept: number): Photo[] =>
    files.slice(0, PHOTO_MAX - kept).map((file) => {
      const url = URL.createObjectURL(file)
      createdUrls.current.push(url)
      return { id: crypto.randomUUID(), url, key: null, file }
    })

  /**
   * 받을 수 있는 파일과 아닌 것을 가른다.
   *
   * 형식이 틀린 파일은 목록에 넣지 않는다 — 다시 시도해도 같은 이유로 막히는데 다섯 칸
   * 중 한 칸을 잡아먹는다. 대신 아래에 이유를 적는다.
   */
  const sortFiles = (files: File[]) => {
    const ok: File[] = []
    const bad: { name: string; reason: string }[] = []
    files.forEach((file) => {
      const reason = imageRejectReason(file)
      if (reason) bad.push({ name: file.name, reason })
      else ok.push(file)
    })
    return { ok, bad }
  }

  /**
   * 한 장을 올린다. 실패하면 한 번만 자동으로 다시 보내고, 그래도 안 되면 목록에서 뺀다.
   *
   * 실패한 사진을 목록에 남겨 두지 않는 이유가 있다 — 다섯 칸 중 한 칸을 먹고, 화면에
   * 「다시 시도」 같은 누를 것을 만든다. 대개 일시적인 문제라 한 번 더 보내면 되고,
   * 두 번 다 안 되면 지금은 못 올리는 것이니 이유만 알려 주는 편이 낫다.
   */
  const runUpload = async (
    photo: Photo,
    apply: (change: (list: Photo[]) => Photo[]) => void,
    onFail: (failure: { name: string; reason: string }) => void,
    attempt = 1,
  ) => {
    if (!photo.file) return

    const controller = new AbortController()
    uploads.current.set(photo.id, controller)

    try {
      // 긴 변 1920px 로 줄여 보낸다. 회전 정보까지 함께 다룬다 — downscaleImage 주석 참고.
      const sending = await downscaleImage(photo.file)
      const { key, url } = await uploadListingImage(sending, controller.signal)

      /*
       * 서버 주소로 갈아 끼우고 objectURL 은 놓아준다. 서버 주소는 문자열이라 임시 저장에
       * 담기고, 그래서 새로고침해도 사진이 살아남는다.
       *
       * 그 사이 사진이 지워졌으면 목록에 id 가 없다. 그때는 배열을 그대로 돌려준다 —
       * 새 배열을 만들면 내용이 같은데도 저장이 한 번 더 돈다.
       */
      apply((list) =>
        list.some((item) => item.id === photo.id)
          ? list.map((item) => (item.id === photo.id ? { ...item, key, url } : item))
          : list,
      )
      URL.revokeObjectURL(photo.url)
    } catch (error) {
      // 우리가 끊은 것이면 알릴 사람이 없다. 그 사진은 이미 화면에서 사라졌다.
      if (controller.signal.aborted) return

      if (attempt === 1) {
        uploads.current.delete(photo.id)
        await runUpload(photo, apply, onFail, 2)
        return
      }

      apply((list) => list.filter((item) => item.id !== photo.id))
      URL.revokeObjectURL(photo.url)
      onFail({ name: photo.file.name, reason: uploadErrorMessage(error) })
    } finally {
      uploads.current.delete(photo.id)
    }
  }

  /**
   * 사진을 뺀다. 올라가는 중이면 업로드부터 끊는다.
   *
   * 끊는 일은 상태 갱신 함수 밖에서 해야 한다 — 안에 두면 리액트가 갱신 함수를 두 번
   * 부를 때 같이 두 번 실행된다.
   */
  const removePhoto = (list: Photo[], index: number, apply: (change: (l: Photo[]) => Photo[]) => void) => {
    const photo = list[index]
    if (!photo) return
    uploads.current.get(photo.id)?.abort()
    uploads.current.delete(photo.id)
    apply((items) => dropPhoto(items, index))
  }

  const changePhotos = (change: (list: Photo[]) => Photo[]) => setPhotos(change)

  const addPhotos = (files: File[]) => {
    const { ok, bad } = sortFiles(files)
    setFailures(bad)
    const added = toPhotos(ok, photos.length)
    if (added.length === 0) return
    setPhotos((current) => [...current, ...added])
    added.forEach(
      (photo) =>
        void runUpload(photo, changePhotos, (failure) =>
          setFailures((current) => [...current, failure]),
        ),
    )
  }

  const addRoomPhotos = (roomId: string, files: File[]) => {
    const { ok, bad } = sortFiles(files)
    setRoomFailures((current) => ({ ...current, [roomId]: bad }))
    const added = toPhotos(ok, roomPhotos[roomId]?.length ?? 0)
    if (added.length === 0) return
    setRoomPhotos((current) => ({ ...current, [roomId]: [...(current[roomId] ?? []), ...added] }))
    added.forEach(
      (photo) =>
        void runUpload(
          photo,
          (change) => changeRoomPhotos(roomId, change),
          (failure) =>
            setRoomFailures((current) => ({
              ...current,
              [roomId]: [...(current[roomId] ?? []), failure],
            })),
        ),
    )
  }

  /**
   * 지운 사진의 미리보기 주소는 바로 놓아준다. 서버 주소로 갈아 끼운 뒤라면 놓아줄 게 없다.
   *
   * 서버에는 지우라고 알리지 않는다 — 삭제 API 가 없고, 등록 요청에 담지 않으면 7일 뒤
   * 자동으로 사라진다.
   */
  const dropPhoto = (list: Photo[], index: number) => {
    if (list[index].key === null) URL.revokeObjectURL(list[index].url)
    return list.filter((_, position) => position !== index)
  }

  /** 첫 장이 대표 사진이라 순서만 앞으로 당긴다. */
  const liftPhoto = (list: Photo[], index: number) => [
    list[index],
    ...list.filter((_, position) => position !== index),
  ]

  /** 끌어놓기로 자리를 바꾼다. 빼고 나서 넣어야 뒤로 옮길 때 자리가 밀리지 않는다. */
  const movePhoto = (list: Photo[], from: number, to: number) => {
    if (from === to) return list
    const next = list.filter((_, position) => position !== from)
    next.splice(to, 0, list[from])
    return next
  }

  const changeRoomPhotos = (roomId: string, change: (list: Photo[]) => Photo[]) => {
    setRoomPhotos((current) => ({ ...current, [roomId]: change(current[roomId] ?? []) }))
  }

  const goPrev = () => setDraft((current) => ({ ...current, step: current.step - 1 }))

  /*
   * draft 상태의 사진 목록은 처음 불러올 때 것 그대로다 — 사진은 photos 상태로 살고 저장할
   * 때만 변환해 담는다. 그래서 저장 직전에 항상 지금 사진으로 갈아 끼운다. 이걸 빼먹으면
   * 「다음」이 방금 올린 사진을 옛 목록으로 덮어써 버린다.
   */
  const withPhotos = (base: ListingDraft): ListingDraft => ({
    ...base,
    branchPhotos: toStored(photos),
    roomPhotos: toStoredMap(roomPhotos),
  })

  const goNext = () => {
    setDraft((current) => {
      const next = { ...current, step: current.step + 1 }
      if (!editing) saveDraft(withPhotos(next))
      return next
    })
  }

  /** 신규 등록은 POST, 수정은 모든 단계의 값을 모아 마지막에 PUT 한 번만 보낸다. */
  const submit = async (): Promise<boolean> => {
    if (submitInFlight.current) return false

    const payload = editing
      ? buildListingUpdateRequest(draft, photos, roomPhotos, inactiveRooms)
      : buildListingRequest(draft, photos, roomPhotos)
    if (payload === null) {
      setSubmitError('입력하신 내용 중 빠진 것이 있습니다. 이전 단계를 다시 확인해 주세요.')
      return false
    }

    submitInFlight.current = true
    setSubmitting(true)
    setSubmitError(null)

    try {
      if (editing && listingId !== undefined) {
        await updateListing(listingId, payload)
        navigate('/listings', { replace: true })
        return true
      }

      const created = await createListing(payload)
      clearDraft()
      setReceiptNo(created.listingId)
      setDraft((current) => ({ ...current, step: 9 }))
      return true
    } catch (error) {
      setSubmitError(
        editing ? updateListingErrorMessage(error) : createErrorMessage(error),
      )
      return false
    } finally {
      submitInFlight.current = false
      setSubmitting(false)
    }
  }

  /** 공개 매물만 재심사 동안 숨겨지므로 확인 팝업을 한 번 더 거친다. */
  const requestSubmit = () => {
    if (editing && originalStatus === 'PUBLISHED') {
      setUpdateConfirm(true)
      return
    }
    void submit()
  }

  const preserveRemovedRoom = (room: ListingDraft['roomTypes'][number]) => {
    if (!editing || room.roomOfferId === null) return
    setInactiveRooms((current) =>
      current.some((item) => item.roomOfferId === room.roomOfferId)
        ? current
        : [...current, { ...room, status: 'INACTIVE' }],
    )
  }

  const restart = () => {
    clearDraft()
    setDraft(emptyDraft())
    setPhotos([])
    setRoomPhotos({})
    setExpandedRoomId(null)
    setReceiptNo(null)
    setSubmitError(null)
  }

  const resume = () => {
    const saved = loadDraft()
    setDraft(saved)
    setPhotos(saved.branchPhotos.map(restorePhoto))
    setRoomPhotos(
      Object.fromEntries(
        Object.entries(saved.roomPhotos).map(([roomId, list]) => [
          roomId,
          list.map(restorePhoto),
        ]),
      ),
    )
    setExpandedRoomId(null)
    setFailures([])
    setRoomFailures({})
    setSubmitError(null)
    setRestoreGeneration((current) => current + 1)
  }

  const patch = <Section extends 'branch' | 'building' | 'conditions' | 'survey' | 'contact'>(
    section: Section,
  ) => {
    return (values: Partial<ListingDraft[Section]>) =>
      setDraft((current) => ({ ...current, [section]: { ...current[section], ...values } }))
  }

  if (editing && (editLoading || editLoadError !== null)) {
    return (
      <div className="flex min-h-dvh flex-col bg-white">
        <AppHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
          {editLoading ? (
            <p className="text-cool-neutral-30 text-base leading-6">매물 정보를 불러오는 중입니다.</p>
          ) : (
            <>
              <p role="alert" className="text-cool-neutral-30 text-base leading-6">
                {editLoadError}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/listings')}
                  className="bg-cool-neutral-20 border-line-alternative h-12 rounded-2xl border px-6 text-base leading-6 font-semibold text-white"
                >
                  목록으로
                </button>
                <button
                  type="button"
                  onClick={() => setEditReload((current) => current + 1)}
                  className="bg-label-normal border-line-normal h-12 rounded-2xl border px-6 text-base leading-6 font-semibold text-white"
                >
                  다시 시도
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    )
  }

  return (
    /*
     * 화면 높이에 딱 맞춘 세로 flex 다. 헤더와 하단(진행 표시줄 + 이전/다음)은 제자리에
     * 두고 가운데 본문만 굴린다 — 스크롤은 StepBody 가 맡는다.
     */
    <div className="flex h-dvh flex-col overflow-hidden bg-white">
      <AppHeader />

      {draft.step === 0 && (
        <SpaceTypeStep
          value={draft.spaceType}
          onChange={(spaceType) => setDraft((current) => ({ ...current, spaceType }))}
          onNext={goNext}
        />
      )}
      {draft.step === 1 && (
        <BranchInfoStep
          value={draft.branch}
          onChange={patch('branch')}
          onPrev={goPrev}
          onNext={goNext}
          detailRequired={!editing}
        />
      )}
      {draft.step === 2 && (
        <BuildingInfoStep
          value={draft.building}
          onChange={patch('building')}
          photos={photos}
          onAddPhotos={addPhotos}
          onRemovePhoto={(index) => removePhoto(photos, index, changePhotos)}
          onMakePhotoPrimary={(index) => setPhotos((current) => liftPhoto(current, index))}
          onMovePhoto={(from, to) => setPhotos((current) => movePhoto(current, from, to))}
          photoFailures={failures}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
      {draft.step === 3 && (
        <ConditionsStep
          value={draft.conditions}
          onChange={patch('conditions')}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
      {draft.step === 4 && (
        <AmenitiesStep
          value={draft.amenities}
          onChange={(amenities) => setDraft((current) => ({ ...current, amenities }))}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
      {draft.step === 5 && (
        <RoomTypesStep
          value={draft.roomTypes}
          onChange={(roomTypes) => setDraft((current) => ({ ...current, roomTypes }))}
          onRemoveRoom={preserveRemovedRoom}
          expandedId={expandedRoomId}
          onExpandedChange={setExpandedRoomId}
          photos={roomPhotos}
          onAddPhotos={addRoomPhotos}
          onRemovePhoto={(roomId, index) =>
            removePhoto(roomPhotos[roomId] ?? [], index, (change) =>
              changeRoomPhotos(roomId, change),
            )
          }
          onMakePhotoPrimary={(roomId, index) =>
            changeRoomPhotos(roomId, (list) => liftPhoto(list, index))
          }
          onMovePhoto={(roomId, from, to) =>
            changeRoomPhotos(roomId, (list) => movePhoto(list, from, to))
          }
          photoFailures={roomFailures}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
      {draft.step === 6 && (
        <SurveyStep
          value={draft.survey}
          onChange={patch('survey')}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
      {draft.step === 7 && (
        <ContactStep
          value={draft.contact}
          onChange={patch('contact')}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
      {draft.step === 8 && (
        <ReviewStep
          draft={draft}
          photos={photos}
          roomPhotos={roomPhotos}
          onSaveDraft={editing ? undefined : () => saveDraft(withPhotos(draft))}
          onPrev={goPrev}
          onSubmit={requestSubmit}
          editing={editing}
          submitting={submitting}
          submitError={submitError}
        />
      )}
      {draft.step === 9 && <SubmittedStep receiptNo={receiptNo} onRestart={restart} />}

      <ResumeDraftDialog
        open={!editing && resumeAsk}
        onResume={() => {
          resume()
          setResumeAsk(false)
        }}
        onRestart={() => {
          restart()
          setResumeAsk(false)
        }}
      />

      <ListingUpdateConfirmDialog
        open={updateConfirm}
        submitting={submitting}
        onCancel={() => setUpdateConfirm(false)}
        onConfirm={async () => {
          const succeeded = await submit()
          // 성공하면 목록 이동으로 이 화면 자체가 사라진다. 실패할 때만 팝업을 내려
          // 마지막 확인 화면의 오류 문구가 바로 보이게 한다.
          if (!succeeded) setUpdateConfirm(false)
        }}
      />
    </div>
  )
}
