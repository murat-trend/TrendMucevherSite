export type AccessType = 'free' | 'restricted'

export type RemauraNavKey =
  | 'jewelryDesign'
  | 'backgroundRemoval'
  | 'photoEdit'
  | 'removeObject'
  | 'tryOn'
  | 'ai3d'
  | 'convert3d'
  | 'videoOptimize'
  | 'webmToMp4'
  | 'studio'
  | 'kolleksiyonEdit'
  | 'isimKolye'
  | 'koleksiyonLab'
  | 'sosyalBoyut'
  | 'sosyalPost'
  | 'etsyBoyut'
  | 'hologram'
  | 'meshTemizle'
  | 'hollow'
  | 'ajur'
  | 'sivi'
  | 'creativeStudio'
  | 'nakkas'

export type RemauraCategory = {
  id: string
  labelKey: RemauraNavKey
  icon: string
  path: string
  workspaceTab?: 'jewelry' | 'background' | 'photoEdit' | 'mesh3d'
  accessType: AccessType
  isSuperAdminOnly: boolean
  isActive: boolean
}

export const REMAURA_CATEGORIES: RemauraCategory[] = [
  {
    id: 'jewelry',
    labelKey: 'jewelryDesign',
    icon: '💎',
    path: '/remaura?category=jewelry',
    workspaceTab: 'jewelry',
    accessType: 'restricted',
    isSuperAdminOnly: false,
    isActive: true,
  },
  {
    id: 'background',
    labelKey: 'backgroundRemoval',
    icon: '🖼️',
    path: '/remaura/arka-plan-kaldir',
    workspaceTab: 'background',
    accessType: 'free',
    isSuperAdminOnly: false,
    isActive: true,
  },
  {
    id: 'photo-edit',
    labelKey: 'photoEdit',
    icon: '✏️',
    path: '/remaura/foto-edit',
    workspaceTab: 'photoEdit',
    accessType: 'free',
    isSuperAdminOnly: false,
    isActive: true,
  },
  {
    id: 'nesne-kaldir',
    labelKey: 'removeObject',
    icon: '✂️',
    path: '/remaura/nesne-kaldir',
    accessType: 'restricted',
    isSuperAdminOnly: false,
    isActive: true,
  },
  {
    id: 'uzerinde-gor',
    labelKey: 'tryOn',
    icon: '💍',
    path: '/remaura/uzerinde-gor',
    accessType: 'restricted',
    isSuperAdminOnly: false,
    isActive: true,
  },
  {
    id: 'mesh3d',
    labelKey: 'ai3d',
    icon: '🧊',
    path: '/remaura?category=mesh3d',
    workspaceTab: 'mesh3d',
    accessType: 'restricted',
    isSuperAdminOnly: false,
    isActive: true,
  },
  {
    id: 'convert',
    labelKey: 'convert3d',
    icon: '🔄',
    path: '/convert',
    accessType: 'free',
    isSuperAdminOnly: false,
    isActive: true,
  },
  {
    id: 'video-optimize',
    labelKey: 'videoOptimize',
    icon: '🎬',
    path: '/remaura/video-optimize',
    accessType: 'free',
    isSuperAdminOnly: false,
    isActive: true,
  },
  {
    id: 'webm-to-mp4',
    labelKey: 'webmToMp4',
    icon: '🎥',
    path: '/remaura/webm-to-mp4',
    accessType: 'free',
    isSuperAdminOnly: false,
    isActive: true,
  },
  {
    id: 'studio',
    labelKey: 'studio',
    icon: '🎨',
    path: '/studio',
    accessType: 'restricted',
    isSuperAdminOnly: false,
    isActive: true,
  },
  {
    id: 'koleksiyon-edit',
    labelKey: 'kolleksiyonEdit',
    icon: '📁',
    path: '/remaura/koleksiyon-edit',
    accessType: 'restricted',
    isSuperAdminOnly: true,
    isActive: true,
  },
  {
    id: 'isim-kolye',
    labelKey: 'isimKolye',
    icon: '✦',
    path: '/remaura/isim-kolye',
    accessType: 'restricted',
    isSuperAdminOnly: true,
    isActive: true,
  },
  {
    id: 'koleksiyon-lab',
    labelKey: 'koleksiyonLab',
    icon: '🧪',
    path: '/remaura/koleksiyon-lab',
    accessType: 'restricted',
    isSuperAdminOnly: true,
    isActive: true,
  },
  {
    id: 'sosyal-boyut',
    labelKey: 'sosyalBoyut',
    icon: '📐',
    path: '/remaura/sosyal-boyut',
    accessType: 'restricted',
    isSuperAdminOnly: true,
    isActive: true,
  },
  {
    id: 'sosyal-post',
    labelKey: 'sosyalPost',
    icon: '🖼️',
    path: '/remaura/sosyal-post',
    accessType: 'restricted',
    isSuperAdminOnly: true,
    isActive: true,
  },
  {
    id: 'etsy-boyut',
    labelKey: 'etsyBoyut',
    icon: '🛍️',
    path: '/remaura/etsy-boyut',
    accessType: 'restricted',
    isSuperAdminOnly: true,
    isActive: true,
  },
  {
    id: 'hologram',
    labelKey: 'hologram',
    icon: '🔮',
    path: '/remaura/hologram',
    accessType: 'restricted',
    isSuperAdminOnly: true,
    isActive: true,
  },
  {
    id: 'mesh-temizle',
    labelKey: 'meshTemizle',
    icon: '🧼',
    path: '/remaura/mesh-temizle',
    accessType: 'restricted',
    isSuperAdminOnly: true,
    isActive: true,
  },
  {
    id: 'hollow',
    labelKey: 'hollow',
    icon: '🕳️',
    path: '/remaura/hollow',
    accessType: 'restricted',
    isSuperAdminOnly: true,
    isActive: true,
  },
  {
    id: 'ajur',
    labelKey: 'ajur',
    icon: '🪟',
    path: '/remaura/ajur',
    accessType: 'restricted',
    isSuperAdminOnly: true,
    isActive: true,
  },
  {
    id: 'sivi',
    labelKey: 'sivi',
    icon: '💧',
    path: '/remaura/sivi',
    accessType: 'restricted',
    isSuperAdminOnly: true,
    isActive: true,
  },
  {
    id: 'creative-studio',
    labelKey: 'creativeStudio',
    icon: '🎞️',
    path: '/remaura/creative-studio',
    accessType: 'restricted',
    isSuperAdminOnly: true,
    isActive: true,
  },
  {
    id: 'nakkas',
    labelKey: 'nakkas',
    icon: '🖋️',
    path: '/remaura/nakkas',
    accessType: 'restricted',
    isSuperAdminOnly: true,
    isActive: true,
  },
]
