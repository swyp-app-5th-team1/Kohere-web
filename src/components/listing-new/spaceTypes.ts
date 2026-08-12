import type { ComponentType, SVGProps } from 'react'
import { ColivingIcon, GoshiwonIcon, ShareHouseIcon } from './SpaceTypeIcons'

/** 서버 enum 이 정해지면 값만 맞춰 바꾼다. 화면은 label · description 만 쓴다. */
export type SpaceType = 'GOSHIWON' | 'COLIVING' | 'SHARE_HOUSE'

export const SPACE_TYPES: {
  value: SpaceType
  label: string
  description: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}[] = [
  { value: 'GOSHIWON', label: '고시원', description: '호실 단위로 등록해요', Icon: GoshiwonIcon },
  { value: 'COLIVING', label: '코리빙', description: '방 타입 단위로 등록해요', Icon: ColivingIcon },
  {
    value: 'SHARE_HOUSE',
    label: '쉐어하우스',
    description: '방 타입 단위로 등록해요',
    Icon: ShareHouseIcon,
  },
]
