// ─── AUTH ────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
}

// ─── ENUMS ───────────────────────────────────────────────────────────────────
export type AnimalSex      = 'semental' | 'yegua' | 'potro' | 'potra' | 'castrado'
export type AnimalStatus   = 'activo' | 'vendido' | 'fallecido' | 'cedido' | 'custodia'
export type MontaType      = 'natural' | 'ia'
export type PregnancyResult= 'gestante' | 'cria_viva' | 'aborto' | 'gemelar' | 'mortinato' | 'no_prenada'
export type ShippingResult = 'prenez' | 'espera' | 'sin_prenez'
export type PaymentStatus  = 'sin_pagos' | 'parcial' | 'completo'   // derived from sum(payments) vs agreed_price
export type EpisodeStatus  = 'activo' | 'resuelto' | 'cronico'
export type DocType        = 'veterinario' | 'genetica' | 'certificado' | 'otro'
export type HerradoType    = 'completo' | 'recorte' | 'perdida'
export type VacunaType     = 'gripe' | 'tetanos' | 'desparasitacion' | 'rinoneumonitis' | 'nilo' | 'otro'
export type ParcelaStatus  = 'ocupada' | 'libre' | 'descanso' | 'tratamiento'
export type TaskStatus     = 'pendiente' | 'completada'
export type TaskOrigin     = 'manual' | 'auto_parto' | 'auto_herrado' | 'auto_vacuna'
export type ClientTagType  = 'cubricion' | 'vientre' | 'vendedor'
export type CoatBase       = 'negro' | 'castano' | 'alazan'
export type CoatPattern    = 'lisa' | 'pio' | 'appaloosa'

// ─── ANIMAL ──────────────────────────────────────────────────────────────────
export interface Animal {
  id: string
  owner_id: string
  name: string
  alias?: string
  sex: AnimalSex
  breed: string
  status: AnimalStatus
  birth_date?: string          // ISO date
  registry_number?: string
  chip?: string
  // coat
  coat_base?: CoatBase
  coat_pattern?: CoatPattern
  coat_careto?: boolean
  coat_cuatroalbo?: boolean
  coat_description?: string
  // azulejo customisation
  azulejo_ink?: string
  azulejo_bg?: string
  azulejo_spot_ink?: string
  // genealogy
  sire_id?: string             // null if external
  sire_external_name?: string
  dam_id?: string
  dam_external_name?: string
  // grandparent external names (used when parent is external)
  sire_gs_external_name?: string  // paternal grandfather
  sire_gd_external_name?: string  // paternal grandmother
  dam_gs_external_name?: string   // maternal grandfather
  dam_gd_external_name?: string   // maternal grandmother
  // location
  meadow_id?: string
  // economics (own animals)
  purchase_price?: number
  purchase_date?: string
  purchase_origin?: string
  transport_cost?: number
  appraisal_value?: number
  // sale
  sold_price?: number
  sold_date?: string
  sold_client_id?: string
  kept_after_sale?: boolean    // cedido en explotación tras venta
  // ios album
  ios_album?: string
  // custody
  custody_owner_name?: string
  custody_owner_phone?: string
  custody_owner_dni?: string
  // notes
  description?: string
  private_notes?: string
  created_at: string
  updated_at: string
}

// ─── BREED ───────────────────────────────────────────────────────────────────
export interface Breed {
  id: string
  name: string
}

// ─── MEADOW / PARCELA ────────────────────────────────────────────────────────
export interface Meadow {
  id: string
  owner_id: string
  name: string
  surface_ha?: number
  cadastral_ref?: string
  status: ParcelaStatus
  icon_emoji?: string
  color_rgba?: string          // e.g. "rgba(46,107,62,0.18)"
  has_water?: boolean          // false = no water point (hide water UI); default true
  notes?: string
  created_at: string
}

export interface MeadowWaterLog {
  id: string
  meadow_id: string
  logged_at: string            // ISO datetime
}

export interface MeadowFoodLog {
  id: string
  meadow_id: string
  logged_at: string
}

export interface AnimalMeadowHistory {
  id: string
  animal_id: string
  meadow_id: string
  entered_at: string
  left_at?: string
}

// ─── GENETICS ────────────────────────────────────────────────────────────────
export interface AnimalGenetics {
  id: string
  animal_id: string
  // core loci (visible by default)
  grey?: string        // GG | Gg | gg
  extension?: string   // EE | Ee | ee
  agouti?: string      // AA | Aa | aa
  cream?: string       // N/N | N/Cr | Cr/Cr
  pearl?: string       // N/N | N/Prl | Prl/Prl
  appaloosa?: string   // N/N | N/LP | LP/LP
  patn1?: string       // N/N | N/PATN1 | PATN1/PATN1 (pattern-1 modifier, with LP -> leopard)
  // extended loci (collapsed by default)
  dun?: string
  silver?: string
  roan?: string
  tobiano?: string
  overo?: string
  sabino?: string
  // lab pdf
  lab_pdf_path?: string
  lab_date?: string
  lab_institution?: string
  notes?: string
  updated_at: string
}

// ─── PREGNANCY / VIENTRE ─────────────────────────────────────────────────────
export interface Pregnancy {
  id: string
  mare_id: string
  sire_id?: string             // null if external
  sire_external_name?: string
  monta_type: MontaType
  vet_name?: string            // for IA
  covered_date: string
  confirmed_date?: string
  expected_birth_date?: string // auto: covered_date + 340 days
  actual_birth_date?: string
  result: PregnancyResult
  foal_id?: string             // animal id if registered
  notes?: string
  created_at: string
}

export interface PregnancySale {
  id: string
  pregnancy_id: string
  client_id: string
  agreed_price: number
  payments?: Payment[]        // embedded when queried with payments(*)
  delivery_date?: string
  notes?: string
  created_at: string
}

export interface Payment {
  id: string
  owner_id: string
  pregnancy_sale_id?: string | null
  semen_sale_id?: string | null
  amount: number
  paid_date: string
  method?: string | null
  notes?: string | null
  created_at: string
}

// ─── SEMEN / CUBRICION ───────────────────────────────────────────────────────
export interface SemenSale {
  id: string
  stallion_id: string
  client_id: string
  mare_name?: string
  mare_birth_date?: string
  mare_chip?: string
  mare_ueln?: string
  agreed_price: number
  payments?: Payment[]        // embedded when queried with payments(*)
  year: number
  notes?: string
  created_at: string
}

export interface SemenShipping {
  id: string
  semen_sale_id: string
  attempt_number: 1 | 2 | 3 | 4 | 5
  estimated_date?: string
  actual_date?: string
  result: ShippingResult
  notes?: string
  created_at: string
}

// ─── SHOEING / HERRADO ───────────────────────────────────────────────────────
export interface ShoeingRecord {
  id: string
  animal_id: string
  date: string
  type: HerradoType
  farrier_name?: string
  cost?: number
  next_estimated_date?: string
  notes?: string
  created_at: string
}

// ─── HEALTH / SALUD ──────────────────────────────────────────────────────────
export interface HealthEpisode {
  id: string
  animal_id: string
  title: string
  start_date: string
  end_date?: string
  status: EpisodeStatus
  vet_name?: string
  treatment?: string
  notes?: string
  created_at: string
}

export interface Vaccine {
  id: string
  animal_id: string
  type: VacunaType
  custom_name?: string
  date_applied: string
  next_date?: string
  vet_name?: string
  notes?: string
  created_at: string
}

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────
export interface AnimalDocument {
  id: string
  animal_id: string
  name: string
  type: DocType
  storage_path: string
  file_size_kb?: number
  issuer?: string
  issued_date?: string
  notes?: string
  created_at: string
}

// ─── COSTS ───────────────────────────────────────────────────────────────────
export type CostCategory = 'veterinario' | 'herrador' | 'nutricion' | 'instalacion' | 'transporte' | 'otro'
export type IncomeCategory = 'cubricion' | 'vientre' | 'venta' | 'manutención' | 'otro'

export interface AnimalCost {
  id: string
  animal_id: string
  category: CostCategory
  amount: number
  date: string
  description?: string
  created_at: string
}

// ─── CUSTODY / MANUTENCIÓN ───────────────────────────────────────────────────
export interface MaintenanceFee {
  id: string
  animal_id: string
  monthly_amount: number
  effective_from: string       // ISO date — month start
  notes?: string
  created_at: string
}

export interface MaintenanceEntry {
  id: string
  animal_id: string
  fee_id: string
  month: string                // ISO date — first day of month
  amount: number
  payment_status: 'pagado' | 'pendiente'
  paid_date?: string
  created_at: string
}

// ─── CLIENTS ─────────────────────────────────────────────────────────────────
export interface Client {
  id: string
  owner_id: string
  name: string
  phone?: string               // unique identifier
  instagram?: string           // unique identifier (without @)
  dni?: string
  city?: string
  stable_name?: string
  notes?: string
  created_at: string
  updated_at: string
}

// derived — computed from transactions
export interface ClientSummary extends Client {
  tags: ClientTagType[]
  total_operations: number
  total_paid: number
  total_pending: number
}

// ─── TASKS / AGENDA ──────────────────────────────────────────────────────────
export interface Task {
  id: string
  owner_id: string
  title: string
  description?: string
  due_date?: string            // ISO date
  status: TaskStatus
  origin: TaskOrigin
  animal_id?: string           // linked animal if any
  priority?: 'alta' | 'media' | 'baja'
  completed_at?: string
  created_at: string
}

export interface DailyNote {
  id: string
  owner_id: string
  date: string                 // ISO date — one per day
  content: string
  updated_at: string
}

// ─── AUDIT ───────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string
  user_id: string
  table_name: string
  record_id: string
  changes: Record<string, unknown>
  created_at: string
}
