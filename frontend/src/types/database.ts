// ============================================================================
// onenight — database types
// Hand-written to mirror supabase/migrations/001_initial_schema.sql.
// Nullable columns -> `string | null`. Timestamps are ISO strings.
// ============================================================================

// --- enum / status unions -------------------------------------------------

export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair'

export type ListingStatus = 'pending' | 'approved' | 'rejected' | 'hidden'

export type AvailabilityRequestStatus =
  | 'pending' // renter sent request, waiting for lister
  | 'confirmed' // lister said yes → contact details revealed to renter
  | 'declined' // lister said no
  | 'expired' // lister did not respond within 24h
  | 'cancelled' // renter cancelled before response

export type NotificationType =
  | 'availability_request_received'
  | 'availability_confirmed'
  | 'availability_declined'
  | 'availability_expired'
  | 'listing_approved'
  | 'listing_rejected'
  | 'review_received'

// --- tables ----------------------------------------------------------------

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  avatar_url: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Listing {
  id: string
  owner_id: string | null
  owner_name: string
  owner_email: string
  owner_phone: string
  title: string
  description: string | null
  brand: string | null
  color: string | null
  size: string
  price_per_night: number
  deposit: number | null
  condition: ListingCondition | null
  style_tags: string[] | null
  location_city: string | null
  status: ListingStatus
  rejection_reason: string | null
  approved_at: string | null
  is_available: boolean
  // price_unlock_ils?: number | null  // future payment hook
  created_at: string
  updated_at: string
}

export interface ListingImage {
  id: string
  listing_id: string
  storage_path: string
  url: string
  is_primary: boolean
  sort_order: number
  created_at: string
}

export interface AvailabilityRequest {
  id: string
  listing_id: string
  renter_id: string | null
  renter_email: string
  renter_name: string
  renter_phone: string | null
  status: AvailabilityRequestStatus
  lister_response_at: string | null
  lister_message: string | null
  expires_at: string
  // payment_status?: 'unpaid' | 'paid' | 'refunded'  // future payment hook
  // payment_intent_id?: string | null
  created_at: string
  updated_at: string
}

export interface Favorite {
  id: string
  user_id: string | null
  guest_session_id: string | null
  listing_id: string
  created_at: string
}

export interface Review {
  id: string
  request_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number // 1–5
  comment: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  payload: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

// --- views -----------------------------------------------------------------

export interface UserRating {
  user_id: string
  average_rating: number
  total_reviews: number
}
