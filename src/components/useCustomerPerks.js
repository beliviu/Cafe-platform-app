/*
 * Data kecil yang dipakai beberapa layar: voucher kafe, poin member, dan tipe pesanan yang dibuka kafe.
 * Semua aman dipanggil sebelum migrasi terkait dijalankan (hasilnya kosong, bukan error).
 */
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'

const MISSING_TABLE = /does not exist|schema cache|could not find/i
const ORDER_TYPES = ['takeaway', 'dine_in']

/** Voucher publik kafe (RLS hanya menampilkan yang aktif & publik). */
export function useCafeVouchers(cafeId) {
  const { supabase } = useAuth()
  const [vouchers, setVouchers] = useState(null)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!cafeId || !supabase) return
    setError('')
    const columns = 'id, code, name, discount_type, discount_value, max_discount, min_subtotal, ends_at'
    const list = (select) => supabase.from('vouchers').select(select).eq('cafe_id', cafeId).order('ends_at')
    let { data, error: queryError } = await list(`${columns}, audience`)
    if (queryError && /audience/i.test(queryError.message)) ({ data, error: queryError } = await list(columns)) // sebelum SQL 20
    if (queryError && MISSING_TABLE.test(queryError.message)) {
      setVouchers([])
      return
    }
    if (queryError) {
      setError(`Voucher gagal dimuat: ${queryError.message}`)
      setVouchers((current) => current || [])
      return
    }
    setVouchers(data || [])
  }, [cafeId, supabase])

  useEffect(() => {
    const timer = setTimeout(reload, 0)
    return () => clearTimeout(timer)
  }, [reload])

  return { vouchers: vouchers || [], loading: vouchers === null && Boolean(cafeId), error, reload }
}

/** Saldo poin & tingkat member. null bila belum login, tamu, atau program loyalti kafe tidak aktif. */
export function useLoyaltyMe(cafeId) {
  const { session, supabase, isGuest } = useAuth()
  const [loyalty, setLoyalty] = useState(null)
  const enabled = Boolean(session && !isGuest && supabase && cafeId)

  useEffect(() => {
    if (!enabled) return undefined
    let active = true
    supabase.rpc('loyalty_me', { p_cafe_id: cafeId })
      .then(({ data }) => { if (active) setLoyalty(data?.enabled ? data : null) })
      .catch(() => {})
    return () => { active = false }
  }, [cafeId, enabled, supabase])

  return enabled ? loyalty : null
}

/** Tipe pesanan yang dibuka kafe (cafe_settings.order_types). Bawaan: bawa pulang & makan di tempat. */
export function useOrderTypes(cafeId) {
  const { supabase } = useAuth()
  const [types, setTypes] = useState(ORDER_TYPES)

  useEffect(() => {
    if (!supabase || !cafeId) return undefined
    let active = true
    supabase.from('cafe_settings').select('order_types').eq('cafe_id', cafeId).maybeSingle()
      .then(({ data }) => {
        const allowed = (data?.order_types || []).filter((type) => ORDER_TYPES.includes(type))
        if (active && allowed.length) setTypes(allowed)
      })
      .catch(() => {})
    return () => { active = false }
  }, [cafeId, supabase])

  return types
}

export const ORDER_TYPE_LABELS = {
  takeaway: { title: 'Bawa Pulang', caption: 'Ambil di kafe tanpa antre' },
  dine_in: { title: 'Makan di Sini', caption: 'Duduk santai, pesanan diantar' },
}

/** Nomor WhatsApp internasional dari nomor telepon kafe (08xx → 628xx). null bila tidak valid. */
export function whatsappNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length < 9) return null
  if (digits.startsWith('62')) return digits
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  if (digits.startsWith('8')) return `62${digits}`
  return digits
}
