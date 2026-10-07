export interface NewsContent {
  title?: string
  excerpt?: string
  author?: string
  content?: string
}

export interface ProgramContent {
  title?: string
  tagline?: string
  desc?: string
  duration?: string
  level?: string
  highlights?: string[]
  curriculum?: string[]
  outcomes?: string[]
}

export interface FacilityContent {
  name?: string
  desc?: string
  features?: string[]
}

export interface StaffContent {
  name?: string
  position?: string
  bio?: string
  expertise?: string[]
  parentId?: string
  order?: number
}

export interface AchievementContent {
  title?: string
  desc?: string
  scope?: string
}

export interface GalleryContent {
  title?: string
}

export interface TestimonialContent {
  quote?: string
  text?: string
}

export interface NewsArticle {
  id: string
  slug: string
  image: string
  category: string
  date: string
  gallery?: string[]
  content: NewsContent | null
}

export interface Program {
  id: string
  slug: string
  icon: string
  image: string
  content: ProgramContent | null
}

export interface Facility {
  id: string
  image: string
  category: string
  content: FacilityContent | null
}

export interface Staff {
  id: string
  image: string
  role: string
  content: StaffContent | null
}

export interface Achievement {
  id: string
  year: number
  image: string
  content: AchievementContent | null
}

export interface GalleryItem {
  id: string
  image: string
  category: string
  content: GalleryContent | null
}

export interface Testimonial {
  id: string
  name: string
  child: string
  image: string
  order: number
  content: TestimonialContent | null
}

export interface SocialLink {
  id: string
  label: string
  href: string
  path: string
}

export interface ContactInfo {
  id: string
  address: string
  phone_primary: string
  phone_secondary: string
  whatsapp: string
  email_primary: string
  email_admission: string
  office_hours: string | null
}

export interface SettingsItem {
  key: string
  value: string
}
