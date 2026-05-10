/** One stored Beer to Gift row (matches planned Supabase columns). */
export type BeerGift = {
  id: string
  /** Always stored uppercase for consistency. */
  code: string
  giftedBy: string
  /**
   * Instant after which the beer is no longer listed (ISO 8601, UTC).
   * Built from the gifter's local date + time inputs.
   */
  expiresAt: string
  note: string | null
  claimed: boolean
  claimedAt: string | null
  createdAt: string
}

export type NewBeerGiftInput = {
  code: string
  giftedBy: string
  /** Local calendar date `YYYY-MM-DD` from the date input. */
  expiryDate: string
  /** Local time from the time input, e.g. `14:30` or `14:30:00`. */
  expiryTime: string
  note: string | null
}
