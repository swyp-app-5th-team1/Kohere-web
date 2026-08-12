import { useEffect, useRef, useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { PHOTO_MAX, type Photo } from '../components/form/PhotoPicker'
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
  loadDraft,
  saveDraft,
  type ListingDraft,
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
export default function ListingNewPage() {
  const [draft, setDraft] = useState<ListingDraft>(loadDraft)
  // 사진은 File 이라 임시 저장에 못 담는다. 화면을 떠나면 사라진다.
  const [photos, setPhotos] = useState<Photo[]>([])
  const [roomPhotos, setRoomPhotos] = useState<Record<string, Photo[]>>({})
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null)

  const createdUrls = useRef<string[]>([])
  useEffect(() => {
    // 배열을 새로 만들지 않고 push 만 하므로, 마운트 때 잡아둔 참조로 전부 해제된다.
    const urls = createdUrls.current
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  /** 미리보기 주소는 상태 갱신 함수 밖에서 만든다. 안에서 만들면 두 번 실행돼 주소가 새어 나간다. */
  const toPhotos = (files: File[], kept: number) =>
    files.slice(0, PHOTO_MAX - kept).map((file) => {
      const photo = { url: URL.createObjectURL(file), file }
      createdUrls.current.push(photo.url)
      return photo
    })

  const addPhotos = (files: File[]) => {
    const added = toPhotos(files, photos.length)
    if (added.length === 0) return
    setPhotos((current) => [...current, ...added])
  }

  const addRoomPhotos = (roomId: string, files: File[]) => {
    const added = toPhotos(files, roomPhotos[roomId]?.length ?? 0)
    if (added.length === 0) return
    setRoomPhotos((current) => ({ ...current, [roomId]: [...(current[roomId] ?? []), ...added] }))
  }

  /** 지운 사진의 미리보기 주소는 바로 놓아준다. 마운트가 끝날 때까지 들고 있을 이유가 없다. */
  const dropPhoto = (list: Photo[], index: number) => {
    URL.revokeObjectURL(list[index].url)
    return list.filter((_, position) => position !== index)
  }

  /** 첫 장이 대표 사진이라 순서만 앞으로 당긴다. */
  const liftPhoto = (list: Photo[], index: number) => [
    list[index],
    ...list.filter((_, position) => position !== index),
  ]

  const changeRoomPhotos = (roomId: string, change: (list: Photo[]) => Photo[]) => {
    setRoomPhotos((current) => ({ ...current, [roomId]: change(current[roomId] ?? []) }))
  }

  const goPrev = () => setDraft((current) => ({ ...current, step: current.step - 1 }))

  const goNext = () => {
    setDraft((current) => {
      const next = { ...current, step: current.step + 1 }
      saveDraft(next)
      return next
    })
  }

  /** 제출하면 임시 저장본을 비운다. 서버 연동 전이라 화면만 완료로 넘긴다. */
  const submit = () => {
    clearDraft()
    setDraft((current) => ({ ...current, step: 9 }))
  }

  const restart = () => {
    clearDraft()
    setDraft(emptyDraft())
    setPhotos([])
    setRoomPhotos({})
    setExpandedRoomId(null)
  }

  const patch = <Section extends 'branch' | 'building' | 'conditions' | 'survey' | 'contact'>(
    section: Section,
  ) => {
    return (values: Partial<ListingDraft[Section]>) =>
      setDraft((current) => ({ ...current, [section]: { ...current[section], ...values } }))
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
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
        />
      )}
      {draft.step === 2 && (
        <BuildingInfoStep
          value={draft.building}
          onChange={patch('building')}
          photos={photos}
          onAddPhotos={addPhotos}
          onRemovePhoto={(index) => setPhotos((current) => dropPhoto(current, index))}
          onMakePhotoPrimary={(index) => setPhotos((current) => liftPhoto(current, index))}
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
          expandedId={expandedRoomId}
          onExpandedChange={setExpandedRoomId}
          photos={roomPhotos}
          onAddPhotos={addRoomPhotos}
          onRemovePhoto={(roomId, index) =>
            changeRoomPhotos(roomId, (list) => dropPhoto(list, index))
          }
          onMakePhotoPrimary={(roomId, index) =>
            changeRoomPhotos(roomId, (list) => liftPhoto(list, index))
          }
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
          onSaveDraft={() => saveDraft(draft)}
          onSubmit={submit}
        />
      )}
      {draft.step === 9 && <SubmittedStep onRestart={restart} />}
    </div>
  )
}
