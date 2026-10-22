import { useMemo, useState } from "react"
import { addDays, format, startOfDay } from "date-fns"
import { fr } from "date-fns/locale"
import {
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  Trash2,
  Video,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/sonner"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  SERVICES,
  getAvailableSlots,
  isDayAvailable,
  loadAppointments,
  saveAppointments,
  type Appointment,
  type Service,
} from "@/lib/booking"

const STEPS = ["Prestation", "Créneau", "Vos infos"] as const

const FORMATS = {
  visio: "Visioconférence",
  onsite: "Sur place",
} as const

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                done && "bg-primary text-primary-foreground",
                active && "bg-butter text-ink ring-1 ring-ink",
                !done && !active && "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden font-medium sm:inline",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span aria-hidden className="h-px w-6 shrink-0 bg-border sm:w-10" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

function ServiceStep({
  selected,
  onSelect,
}: {
  selected?: Service
  onSelect: (s: Service) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {SERVICES.map((s) => {
        const active = selected?.id === s.id
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s)}
            className={cn(
              "rounded-xl border bg-card p-5 text-left shadow-xs outline-none transition-all",
              "hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "border-primary ring-2 ring-primary"
                : "border-border",
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-lg bg-butter text-xl">
                {s.emoji}
              </span>
              <Badge variant="secondary" className="gap-1">
                <Clock className="size-3" />
                {s.duration} min
              </Badge>
            </div>
            <h3 className="text-lg font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {s.description}
            </p>
          </button>
        )
      })}
    </div>
  )
}

function SlotStep({
  service,
  booked,
  date,
  slot,
  onDate,
  onSlot,
}: {
  service: Service
  booked: Appointment[]
  date?: Date
  slot?: Date
  onDate: (d: Date | undefined) => void
  onSlot: (d: Date) => void
}) {
  const slots = useMemo(
    () => (date ? getAvailableSlots(date, service.duration, booked) : []),
    [date, service.duration, booked],
  )
  const today = startOfDay(new Date())

  return (
    <div className="grid gap-6 md:grid-cols-[auto_1fr]">
      <Card className="w-fit self-start">
        <CardContent>
          <Calendar
            mode="single"
            locale={fr}
            weekStartsOn={1}
            selected={date}
            onSelect={onDate}
            disabled={(d) => d < today || !isDayAvailable(d)}
            endMonth={addDays(today, 90)}
            className="[--cell-size:--spacing(10)]"
          />
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-1 text-base font-semibold">
          {date ? format(date, "EEEE d MMMM", { locale: fr }) : "Horaires"}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {date
            ? "Choisissez un horaire (heure de Paris)."
            : "Sélectionnez d'abord un jour dans le calendrier."}
        </p>
        {date && slots.length === 0 && (
          <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            Plus aucun créneau disponible ce jour-là. Essayez une autre date.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {slots.map((s) => {
            const active = slot && s.getTime() === slot.getTime()
            return (
              <Button
                key={s.toISOString()}
                variant={active ? "default" : "outline"}
                size="lg"
                className="h-10 tabular-nums"
                onClick={() => onSlot(s)}
              >
                {format(s, "HH:mm")}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

type Form = {
  name: string
  email: string
  company: string
  format: Appointment["format"]
  message: string
}

const EMPTY_FORM: Form = {
  name: "",
  email: "",
  company: "",
  format: "visio",
  message: "",
}

function validate(f: Form) {
  const errors: Partial<Record<keyof Form, string>> = {}
  if (f.name.trim().length < 2) errors.name = "Indiquez votre nom."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
    errors.email = "Adresse email invalide."
  return errors
}

function DetailsStep({
  form,
  setForm,
  errors,
}: {
  form: Form
  setForm: (f: Form) => void
  errors: ReturnType<typeof validate>
}) {
  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm({ ...form, [k]: v })

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Nom complet</Label>
          <Input
            id="name"
            value={form.name}
            aria-invalid={!!errors.name}
            placeholder="Camille Dupont"
            onChange={(e) => set("name", e.target.value)}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            aria-invalid={!!errors.email}
            placeholder="camille@entreprise.fr"
            onChange={(e) => set("email", e.target.value)}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company">Entreprise (optionnel)</Label>
          <Input
            id="company"
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>Format</Label>
          <Select
            value={form.format}
            onValueChange={(v) => set("format", v as Form["format"])}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{FORMATS[form.format]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="visio">{FORMATS.visio}</SelectItem>
              <SelectItem value="onsite">{FORMATS.onsite}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="message">Message (optionnel)</Label>
        <Textarea
          id="message"
          rows={4}
          value={form.message}
          placeholder="Un contexte, un sujet à aborder en priorité…"
          onChange={(e) => set("message", e.target.value)}
        />
      </div>
    </div>
  )
}

function Summary({
  service,
  slot,
  format: fmt,
}: {
  service?: Service
  slot?: Date
  format: Appointment["format"]
}) {
  return (
    <Card className="bg-ink text-background ring-0">
      <CardHeader>
        <CardDescription className="text-xs font-semibold tracking-widest text-lilac uppercase">
          Votre rendez-vous
        </CardDescription>
        <CardTitle className="text-xl text-butter">
          {service?.title ?? "À choisir"}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-lilac" />
          {slot ? (
            <span className="capitalize">
              {format(slot, "EEEE d MMMM", { locale: fr })}
            </span>
          ) : (
            <span className="opacity-60">Date à choisir</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-lilac" />
          {slot && service ? (
            <span>
              {format(slot, "HH:mm")} · {service.duration} min
            </span>
          ) : (
            <span className="opacity-60">Horaire à choisir</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {fmt === "visio" ? (
            <Video className="size-4 text-lilac" />
          ) : (
            <MapPin className="size-4 text-lilac" />
          )}
          {FORMATS[fmt]}
        </div>
      </CardContent>
    </Card>
  )
}

function MyAppointments({
  items,
  onCancel,
}: {
  items: Appointment[]
  onCancel: (id: string) => void
}) {
  const upcoming = [...items].sort((a, b) => a.start.localeCompare(b.start))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mes rendez-vous</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun rendez-vous pour l'instant.
          </p>
        )}
        {upcoming.map((a) => {
          const service = SERVICES.find((s) => s.id === a.serviceId)
          const start = new Date(a.start)
          return (
            <div
              key={a.id}
              className="flex items-start justify-between gap-3 rounded-lg border bg-background p-3"
            >
              <div className="min-w-0 text-sm">
                <p className="truncate font-semibold">{service?.title}</p>
                <p className="text-muted-foreground capitalize">
                  {format(start, "EEE d MMM · HH:mm", { locale: fr })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Annuler ce rendez-vous"
                onClick={() => onCancel(a.id)}
              >
                <Trash2 />
              </Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default function App() {
  const [appointments, setAppointments] = useState<Appointment[]>(
    loadAppointments,
  )
  const [step, setStep] = useState(0)
  const [service, setService] = useState<Service>()
  const [date, setDate] = useState<Date>()
  const [slot, setSlot] = useState<Date>()
  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [errors, setErrors] = useState<ReturnType<typeof validate>>({})
  const [confirmed, setConfirmed] = useState<Appointment>()

  const persist = (next: Appointment[]) => {
    setAppointments(next)
    saveAppointments(next)
  }

  const reset = () => {
    setStep(0)
    setService(undefined)
    setDate(undefined)
    setSlot(undefined)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const canContinue =
    (step === 0 && !!service) || (step === 1 && !!slot) || step === 2

  const submit = () => {
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length || !service || !slot) return
    const appt: Appointment = {
      id: crypto.randomUUID(),
      serviceId: service.id,
      start: slot.toISOString(),
      end: new Date(slot.getTime() + service.duration * 60_000).toISOString(),
      ...form,
    }
    persist([...appointments, appt])
    setConfirmed(appt)
    reset()
  }

  const next = () => (step === 2 ? submit() : setStep(step + 1))

  const cancel = (id: string) => {
    persist(appointments.filter((a) => a.id !== id))
    toast.success("Rendez-vous annulé")
  }

  const confirmedService = SERVICES.find((s) => s.id === confirmed?.serviceId)

  return (
    <div className="min-h-svh">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2 font-heading text-lg font-bold">
            <span className="flex h-8 items-center justify-center rounded-lg bg-ink px-2 text-sm font-bold text-butter">
              Y&amp;N
            </span>
            Rendez-vous
          </div>
          <Badge variant="outline" className="gap-1">
            <CalendarCheck className="size-3" />
            {appointments.length} à venir
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <section className="mb-10 max-w-2xl">
          <p className="mb-3 text-xs font-semibold tracking-widest text-primary uppercase">
            Prise de rendez-vous
          </p>
          <h1 className="font-heading text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl">
            Réservez un moment avec{" "}
            <span className="rounded-md bg-butter px-2 text-ink">l'équipe</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Choisissez une prestation, un créneau, et c'est réservé. Simple,
            rapide, sans échange d'emails.
          </p>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader className="gap-4">
              <Stepper current={step} />
              <CardTitle className="text-xl">
                {step === 0 && "Quelle prestation vous intéresse ?"}
                {step === 1 && "Quand êtes-vous disponible ?"}
                {step === 2 && "Dernière étape : vos coordonnées"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {step === 0 && (
                <ServiceStep
                  selected={service}
                  onSelect={(s) => {
                    setService(s)
                    setSlot(undefined)
                  }}
                />
              )}
              {step === 1 && service && (
                <SlotStep
                  service={service}
                  booked={appointments}
                  date={date}
                  slot={slot}
                  onDate={(d) => {
                    setDate(d)
                    setSlot(undefined)
                  }}
                  onSlot={setSlot}
                />
              )}
              {step === 2 && (
                <DetailsStep form={form} setForm={setForm} errors={errors} />
              )}

              <Separator className="my-6" />
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  disabled={step === 0}
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft data-icon="inline-start" />
                  Retour
                </Button>
                <Button disabled={!canContinue} onClick={next}>
                  {step === 2 ? "Confirmer le rendez-vous" : "Continuer"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <aside className="grid content-start gap-6">
            <Summary service={service} slot={slot} format={form.format} />
            <MyAppointments items={appointments} onCancel={cancel} />
          </aside>
        </div>
      </main>

      <Dialog
        open={!!confirmed}
        onOpenChange={(open) => !open && setConfirmed(undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-butter">
              <Check className="size-6" />
            </div>
            <DialogTitle className="font-heading text-2xl">
              C'est réservé !
            </DialogTitle>
            <DialogDescription>
              {confirmed && confirmedService && (
                <>
                  {confirmedService.title} le{" "}
                  {format(new Date(confirmed.start), "EEEE d MMMM 'à' HH:mm", {
                    locale: fr,
                  })}
                  . Une confirmation sera envoyée à {confirmed.email}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setConfirmed(undefined)}>Parfait</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster position="bottom-right" />
    </div>
  )
}
