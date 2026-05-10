import type { BeerGift, NewBeerGiftInput } from '../types/beerGift'
import { endOfLocalDay, expiresAtHasPassed, localDateAndTimeToExpiresAtIso } from '../utils/dates'

/**
 * Browser persistence key for the local MVP store.
 * When you wire Supabase, replace reads/writes with a table (for example `beer_gifts`)
 * and keep the same method names on the exported service so UI code stays unchanged.
 */
const STORAGE_KEY = 'beer-gifter:gifts:v1'

export type BeerGiftServiceErrorCode =
  | 'VALIDATION'
  | 'EXPIRED'
  | 'DUPLICATE_CODE'
  | 'NOT_FOUND'

export class BeerGiftServiceError extends Error {
  readonly code: BeerGiftServiceErrorCode

  constructor(code: BeerGiftServiceErrorCode, message: string) {
    super(message)
    this.name = 'BeerGiftServiceError'
    this.code = code
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
    (o.claimedAt !== null && typeof o.claimedAt !== 'string')
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
    createdAt: o.createdAt,
  }
}

function loadAll(): BeerGift[] {
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

function saveAll(rows: BeerGift[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
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
    throw new BeerGiftServiceError('VALIDATION', 'Choose the expiry time from Fanzo (same day as the date).')
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

/**
 * Local-first implementation of the beer gift store.
 *
 * Supabase swap (see `dev-core/guides/supabase-patterns.md`):
 * - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Amplify environment variables.
 * - Create a `beer_gifts` table with columns matching `BeerGift` (or an RPC that returns the same shape).
 * - Replace `loadAll` / `saveAll` with `createClient` queries; for public claim flows, prefer narrow RPCs
 *   or RLS policies so anonymous users can insert gifts and update `claimed` without exposing unrelated rows.
 */
export const beerGiftService = {
  async listAvailable(): Promise<BeerGift[]> {
    await Promise.resolve()
    const rows = loadAll()
    return rows
      .filter((r) => !r.claimed && !expiresAtHasPassed(r.expiresAt))
      .sort((a, b) => {
        const byTime = a.expiresAt.localeCompare(b.expiresAt)
        if (byTime !== 0) return byTime
        return a.createdAt.localeCompare(b.createdAt)
      })
  },

  async add(input: NewBeerGiftInput): Promise<BeerGift> {
    await Promise.resolve()
    const expiresAt = validateNewInput(input)
    const code = normalizeCode(input.code)
    const rows = loadAll()
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
      createdAt: now,
    }
    rows.push(row)
    saveAll(rows)
    return row
  },

  async claim(id: string): Promise<BeerGift> {
    await Promise.resolve()
    const rows = loadAll()
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
    }
    rows[idx] = updated
    saveAll(rows)
    return updated
  },
}
