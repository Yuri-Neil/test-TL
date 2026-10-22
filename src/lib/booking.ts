import { addMinutes, format, isBefore, isWeekend, set } from "date-fns"

export type Service = {
  id: string
  title: string
  description: string
  duration: number
  emoji: string
}

export const SERVICES: Service[] = [
  {
    id: "kickoff",
    title: "Kick-off projet",
    description: "Cadrer vos objectifs, votre périmètre et un plan d'action.",
    duration: 60,
    emoji: "🚀",
  },
  {
    id: "audit",
    title: "Audit express",
    description: "Un regard expert sur votre SEO, SEA ou tracking en 30 min.",
    duration: 30,
    emoji: "🔍",
  },
  {
    id: "review",
    title: "Point de suivi",
    description: "Revue des performances et des prochaines étapes.",
    duration: 45,
    emoji: "📈",
  },
  {
    id: "workshop",
    title: "Atelier créatif",
    description: "Session de brainstorming pour vos contenus et campagnes.",
    duration: 90,
    emoji: "✨",
  },
]

export type Appointment = {
  id: string
  serviceId: string
  start: string // ISO
  end: string // ISO
  name: string
  email: string
  company: string
  format: "visio" | "onsite"
  message: string
}

const STORAGE_KEY = "yn-booking:appointments"

export function loadAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Appointment[]) : []
  } catch {
    return []
  }
}

export function saveAppointments(items: Appointment[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // stockage indisponible : l'état reste en mémoire
  }
}

const DAY_START = 9
const DAY_END = 18
const LUNCH_START = 12.5
const LUNCH_END = 14
const STEP = 30

/** Créneaux théoriques d'une journée pour une durée donnée. */
function daySlots(day: Date, duration: number): Date[] {
  const slots: Date[] = []
  for (let h = DAY_START; h + duration / 60 <= DAY_END; h += STEP / 60) {
    const endH = h + duration / 60
    if (h < LUNCH_END && endH > LUNCH_START) continue
    const hours = Math.floor(h)
    const minutes = Math.round((h - hours) * 60)
    slots.push(set(day, { hours, minutes, seconds: 0, milliseconds: 0 }))
  }
  return slots
}

/** Petit hash déterministe pour simuler des créneaux déjà pris. */
function hash(input: string) {
  let h = 0
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function isDayAvailable(day: Date, now = new Date()) {
  if (isWeekend(day)) return false
  const endOfDay = set(day, { hours: DAY_END, minutes: 0, seconds: 0 })
  return !isBefore(endOfDay, now)
}

export function getAvailableSlots(
  day: Date,
  duration: number,
  booked: Appointment[],
  now = new Date(),
): Date[] {
  if (!isDayAvailable(day, now)) return []
  return daySlots(day, duration).filter((start) => {
    if (isBefore(start, addMinutes(now, 60))) return false
    // ~1 créneau sur 4 est « déjà pris » pour garder un rendu réaliste
    if (hash(format(start, "yyyy-MM-dd'T'HH:mm")) % 4 === 0) return false
    const end = addMinutes(start, duration)
    return !booked.some(
      (a) => start < new Date(a.end) && end > new Date(a.start),
    )
  })
}
