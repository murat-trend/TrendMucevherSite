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
]
