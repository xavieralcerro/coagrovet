import { Bone, Brush, Droplets, Ear, Heart, Palette, PawPrint, Scissors, ShieldPlus, Sparkles, Star, Wind } from 'lucide-react'

// Íconos que el administrador puede elegir para un servicio
export const ICON_OPTIONS = [
  { key: 'droplets', label: 'Gota', icon: Droplets },
  { key: 'shield', label: 'Escudo', icon: ShieldPlus },
  { key: 'scissors', label: 'Tijeras', icon: Scissors },
  { key: 'paw', label: 'Huella', icon: PawPrint },
  { key: 'ear', label: 'Oído', icon: Ear },
  { key: 'sparkles', label: 'Brillo', icon: Sparkles },
  { key: 'wind', label: 'Aire', icon: Wind },
  { key: 'brush', label: 'Cepillo', icon: Brush },
  { key: 'palette', label: 'Paleta', icon: Palette },
  { key: 'heart', label: 'Corazón', icon: Heart },
  { key: 'star', label: 'Estrella', icon: Star },
  { key: 'bone', label: 'Hueso', icon: Bone },
]

export const getServiceIcon = (key) => ICON_OPTIONS.find((o) => o.key === key)?.icon ?? PawPrint