import type { BeerGift, NewBeerGiftInput } from '../types/beerGift'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { endOfLocalDay, expiresAtHasPassed, localDateAndTimeToExpiresAtIso } from '../utils/dates'

/**
 * When Supabase env vars are missing, the app falls back to localStorage (per-browser data only).
 * Production builds should set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on the host.
 */
const STORAGE_KEY = 'beer-gifter:gifts:v1'

export type BeerGiftServiceErrorCode =
  | 'VALIDATION'
  | 'EXPIRED'
  | 'DUPLICATE_CODE'
  | 'NOT_FOUND'
  | 'BACKEND'

export class BeerGiftServiceError extends Error {
  readonly code: BeerGiftServiceErrorCode

  constructor(code: BeerGiftServiceErrorCode, message: string) {
    super(message)
    this.name = 'BeerGiftServiceError'
    this.code = code
  }
}

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase()
}

function validateNewInput(input: NewBeerGiftInput): string {
  const name = input.giftedBy.trim()
  if (!name) {
    throw new BeerGiftServiceError('VALIDATION', 'Add your name so people know who shared the code.')
  }
  const code = normalizeCode(input.code)
  if (code.length !== 4) {
    throw new BeerGiftServiceError('VALIDATION', 'The code must be exactly 4 characters.')
  }
  const date = input.expiryDate?.trim() ?? ''
  if (!date) {
    throw new BeerGiftServiceError('VALIDATION', 'Choose the expiry date from Fanzo.')
  }
  const timeRaw = input.expiryTime?.trim() ?? ''
  if (!timeRaw) {
    throw new BeerGiftServiceError('VALIDATION', 'Choose the expiry hour on the gift form.')
  }

  let expiresAt: string
  try {
    expiresAt = localDateAndTimeToExpiresAtIso(date, timeRaw)
  } catch {
    throw new BeerGiftServiceError('VALIDATION', 'Check the date and time look correct.')
  }

  if (expiresAtHasPassed(expiresAt)) {
    throw new BeerGiftServiceError(
      'EXPIRED',
      'That date and time are already in the past. Pick when the code actually stops working.',
    )
  }

  return expiresAt
}

type BeerGiftDbRow = {
  id: string
  code: string
  gifted_by: string
  expires_at: string
  note: string | null
  claimed: boolean
  claimed_at: string | null
  claimed_by?: string | null
  created_at: string
}

function mapDbRow(row: BeerGiftDbRow): BeerGift {
  return {
    id: row.id,
    code: row.code,
    giftedBy: row.gifted_by,
    expiresAt: row.expires_at,
    note: row.note,
    claimed: row.claimed,
    claimedAt: row.claimed_at,
    claimedBy: row.claimed_by ?? null,
    createdAt: row.created_at,
  }
}

/** Accepts current shape or legacy rows that only had `expiryDate` (end of that local day). */
function normalizeStoredRow(value: unknown): BeerGift | null {
  if (!value || typeof value !== 'object') return null
  const o = value as Record<string, unknown>
  if (
    typeof o.id !== 'string' ||
    typeof o.code !== 'string' ||
    typeof o.giftedBy !== 'string' ||
    typeof o.claimed !== 'boolean' ||
    typeof o.createdAt !== 'string' ||
    (o.note !== null && typeof o.note !== 'string') ||
    (o.claimedAt !== null && typeof o.claimedAt !== 'string') ||
    (o.claimedBy !== undefined && o.claimedBy !== null && typeof o.claimedBy !== 'string')
  ) {
    return null
  }

  let expiresAt: string
  if (typeof o.expiresAt === 'string') {
    const ts = new Date(o.expiresAt).getTime()
    if (Number.isNaN(ts)) return null
    expiresAt = o.expiresAt
  } else if (typeof o.expiryDate === 'string') {
    expiresAt = endOfLocalDay(o.expiryDate).toISOString()
  } else {
    return null
  }

  return {
    id: o.id,
    code: o.code,
    giftedBy: o.giftedBy,
    expiresAt,
    note: o.note === null || typeof o.note === 'string' ? (o.note as string | null) : null,
    claimed: o.claimed,
    claimedAt:
      o.claimedAt === null || typeof o.claimedAt === 'string' ? (o.claimedAt as string | null) : null,
    claimedBy: typeof o.claimedBy === 'string' ? o.claimedBy : null,
    createdAt: o.createdAt,
  }
}

function loadAllLocal(): BeerGift[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeStoredRow).filter((r): r is BeerGift => r !== null)
  } catch {
    return []
  }
}

function saveAllLocal(rows: BeerGift[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
}

async function listAvailableSupabase(): Promise<BeerGift[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('beer_gifts')
    .select('*')
    .order('expires_at', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) {
    throw new BeerGiftServiceError('BACKEND', 'Could not load beers. Try again in a moment.')
  }
  return (data as BeerGiftDbRow[]).map(mapDbRow)
}

async function listAvailableLocal(): Promise<BeerGift[]> {
  await Promise.resolve()
  const rows = loadAllLocal()
  return rows
    .filter((r) => !r.claimed && !expiresAtHasPassed(r.expiresAt))
    .sort((a, b) => {
      const byTime = a.expiresAt.localeCompare(b.expiresAt)
      if (byTime !== 0) return byTime
      return a.createdAt.localeCompare(b.createdAt)
    })
}

/** Rows the shared board would list (anon RLS mirrors this for Supabase). */
async function countAvailableSupabase(): Promise<number> {
  const sb = getSupabase()
  const { count, error } = await sb.from('beer_gifts').select('*', { count: 'exact', head: true })
  if (error) {
    throw new BeerGiftServiceError('BACKEND', 'Could not load availability. Try again in a moment.')
  }
  return count ?? 0
}

async function countAvailableLocal(): Promise<number> {
  await Promise.resolve()
  let n = 0
  for (const r of loadAllLocal()) {
    if (!r.claimed && !expiresAtHasPassed(r.expiresAt)) n += 1
  }
  return n
}

async function addSupabase(input: NewBeerGiftInput): Promise<BeerGift> {
  const expiresAt = validateNewInput(input)
  const code = normalizeCode(input.code)
  const sb = getSupabase()

  const { data: dup, error: dupErr } = await sb
    .from('beer_gifts')
    .select('id')
    .eq('code', code)
    .eq('claimed', false)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
  if (dupErr) {
    throw new BeerGiftServiceError('BACKEND', 'Could not check for duplicates. Try again.')
  }
  if ((dup?.length ?? 0) > 0) {
    throw new BeerGiftServiceError(
      'DUPLICATE_CODE',
      'That code is already listed as available. Wait until it is claimed or remove the old listing first.',
    )
  }

  const { data, error } = await sb
    .from('beer_gifts')
    .insert({
      code,
      gifted_by: input.giftedBy.trim(),
      expires_at: expiresAt,
      note: input.note?.trim() ? input.note.trim() : null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new BeerGiftServiceError('DUPLICATE_CODE', 'That code is already on the board.')
    }
    throw new BeerGiftServiceError('BACKEND', 'Could not save the beer. Try again.')
  }
  return mapDbRow(data as BeerGiftDbRow)
}

async function addLocal(input: NewBeerGiftInput): Promise<BeerGift> {
  await Promise.resolve()
  const expiresAt = validateNewInput(input)
  const code = normalizeCode(input.code)
  const rows = loadAllLocal()
  const duplicate = rows.some(
    (r) => !r.claimed && r.code === code && !expiresAtHasPassed(r.expiresAt),
  )
  if (duplicate) {
    throw new BeerGiftServiceError(
      'DUPLICATE_CODE',
      'That code is already listed as available. Wait until it is claimed or remove the old listing first.',
    )
  }
  const now = new Date().toISOString()
  const row: BeerGift = {
    id: crypto.randomUUID(),
    code,
    giftedBy: input.giftedBy.trim(),
    expiresAt,
    note: input.note?.trim() ? input.note.trim() : null,
    claimed: false,
    claimedAt: null,
    claimedBy: null,
    createdAt: now,
  }
  rows.push(row)
  saveAllLocal(rows)
  return row
}

function normalizeClaimedBy(raw: string): string {
  const t = raw.trim()
  if (!t) {
    throw new BeerGiftServiceError('VALIDATION', 'Add your name so the group knows who took the beer.')
  }
  if (t.length > 80) {
    throw new BeerGiftServiceError('VALIDATION', 'Use a shorter name (80 characters max).')
  }
  return t
}

async function claimSupabase(id: string, claimedBy: string): Promise<BeerGift> {
  const sb = getSupabase()
  const claimer = normalizeClaimedBy(claimedBy)
  // Use RPC so the claimed row can be returned; RLS blocks SELECT on claimed rows,
  // so UPDATE ... select() fails in PostgREST (see supabase/migrations/20260110140000_claim_beer_gift_rpc.sql).
  const { data, error } = await sb.rpc('claim_beer_gift', { p_id: id, p_claimed_by: claimer })

  if (error) {
    const raw = (error.message ?? '').toLowerCase()
    if (raw.includes('add your name')) {
      throw new BeerGiftServiceError('VALIDATION', 'Add your name so the group knows who took the beer.')
    }
    throw new BeerGiftServiceError('BACKEND', 'Could not claim that beer. Try again.')
  }
  if (data === null || data === undefined) {
    throw new BeerGiftServiceError('NOT_FOUND', 'That beer is no longer available.')
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') {
    throw new BeerGiftServiceError('NOT_FOUND', 'That beer is no longer available.')
  }
  return mapDbRow(row as BeerGiftDbRow)
}

async function claimLocal(id: string, claimedBy: string): Promise<BeerGift> {
  await Promise.resolve()
  const claimer = normalizeClaimedBy(claimedBy)
  const rows = loadAllLocal()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx === -1) {
    throw new BeerGiftServiceError('NOT_FOUND', 'That beer is no longer available.')
  }
  const current = rows[idx]
  if (current === undefined) {
    throw new BeerGiftServiceError('NOT_FOUND', 'That beer is no longer available.')
  }
  if (current.claimed) {
    throw new BeerGiftServiceError('NOT_FOUND', 'Someone already claimed this one.')
  }
  if (expiresAtHasPassed(current.expiresAt)) {
    throw new BeerGiftServiceError('EXPIRED', 'That code has expired.')
  }
  const updated: BeerGift = {
    ...current,
    claimed: true,
    claimedAt: new Date().toISOString(),
    claimedBy: claimer,
  }
  rows[idx] = updated
  saveAllLocal(rows)
  return updated
}

/**
 * Shared data when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set (see README).
 * Otherwise localStorage only (same device); fine for local UI checks, not for a group board.
 */
export const beerGiftService = {
  async listAvailable(): Promise<BeerGift[]> {
    if (isSupabaseConfigured()) {
      return listAvailableSupabase()
    }
    return listAvailableLocal()
  },

  /** Number of beers currently listed as available (unclaimed and not expired). */
  async countAvailable(): Promise<number> {
    if (isSupabaseConfigured()) {
      return countAvailableSupabase()
    }
    return countAvailableLocal()
  },

  async add(input: NewBeerGiftInput): Promise<BeerGift> {
    if (isSupabaseConfigured()) {
      return addSupabase(input)
    }
    return addLocal(input)
  },

  async claim(id: string, claimedBy: string): Promise<BeerGift> {
    if (isSupabaseConfigured()) {
      return claimSupabase(id, claimedBy)
    }
    return claimLocal(id, claimedBy)
  },
}
