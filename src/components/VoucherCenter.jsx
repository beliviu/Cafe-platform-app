/*
 * Pusat voucher: kolom kode promo, tab Voucher | Poin, dan kartu voucher berbentuk tiket.
 * mode 'tab'  → tab Voucher di navigasi bawah (Pakai = simpan kode, lanjut ke checkout / menu).
 * mode 'pick' → dibuka dari checkout (Pakai = simpan kode lalu kembali; checkout memakainya otomatis).
 */
import { useState } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Percent, Sparkles, TicketPercent } from 'lucide-react-native'
import { useBrand } from '../brand/useBrand.js'
import { useCart } from '../cart/useCart.js'
import { useAuth } from '../auth/useAuth.js'
import { Button, EmptyState, ErrorBox, formatCurrency, LoadingState, useToast } from './ui.jsx'
import { Text } from './ui/Text.jsx'
import { Bubbles, DashedLine, SectionHeading } from './AppChrome.jsx'
import { useCafeVouchers, useLoyaltyMe } from './useCustomerPerks.js'
import { formatDateShort, formatNumber } from '../lib/format.js'
import { withAlpha } from '../theme/palette.js'
import { makeStyles, useTheme } from '../theme/useTheme.js'

/** "Rp100K" untuk angka bulat ribuan, selain itu format rupiah biasa. */
function shortRupiah(value) {
  const number = Number(value)
  if (number >= 1000 && number % 1000 === 0) return `Rp${formatNumber(number / 1000)}K`
  return formatCurrency(number).replace(/\s/g, '')
}

function voucherHeadline(voucher) {
  return voucher.discount_type === 'percent' ? `Diskon ${Number(voucher.discount_value)}%` : `Potongan ${shortRupiah(voucher.discount_value)}`
}

function useVoucherAction(mode) {
  const { setVoucherCode, itemCount } = useCart()
  const { toast } = useToast()
  return (rawCode) => {
    const code = String(rawCode || '').trim().toUpperCase()
    if (!code) return
    setVoucherCode(code)
    if (mode === 'pick') {
      if (router.canGoBack()) router.back()
      else router.replace('/checkout')
      return
    }
    if (itemCount > 0) {
      router.push('/checkout')
      return
    }
    toast({ tone: 'success', title: `Voucher ${code} disimpan`, description: 'Pilih menu dulu. Voucher dipakai otomatis saat checkout.' })
    router.push('/menu')
  }
}

/** Kartu voucher berbentuk tiket: judul, syarat, sobekan, masa berlaku & minimal transaksi, tombol Pakai. */
export function VoucherTicket({ voucher, onUse, pageColor }) {
  const styles = useStyles()
  const { COLORS } = useTheme()
  const cut = { backgroundColor: pageColor || COLORS.card }
  const terms = [
    voucher.max_discount ? `Maksimum ${shortRupiah(voucher.max_discount)}` : null,
    voucher.audience === 'members' ? 'Khusus member' : voucher.audience === 'all' ? 'Bisa tanpa login' : null,
  ].filter(Boolean).join(' · ')
  return (
    <View style={styles.ticket}>
      <View style={styles.ticketTop}>
        <LinearGradient colors={[withAlpha(COLORS.primaryTint, 0), COLORS.primaryTint]} start={{ x: 0.45, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        <View style={styles.ticketText}>
          <Text style={styles.ticketTitle} numberOfLines={2}>{voucher.name || voucherHeadline(voucher)}</Text>
          <Text style={styles.ticketTerms} numberOfLines={2}>{terms || voucherHeadline(voucher)}</Text>
          <View style={styles.codeChip}><Text style={styles.codeText} selectable tabular>{voucher.code}</Text></View>
        </View>
        <View style={styles.ticketArt} accessibilityElementsHidden importantForAccessibility="no">
          <Bubbles color={COLORS.primary} opacity={0.14} items={[{ size: 22, top: 2, right: 60 }, { size: 10, top: 40, right: 64 }]} />
          <View style={styles.ticketBadge}><Percent size={20} color={COLORS.textOnPrimary} strokeWidth={2.6} /></View>
        </View>
      </View>
      <View style={styles.tear}>
        <View style={[styles.notchClip, styles.notchClipLeft]}><View style={[styles.notch, styles.notchLeft, cut]} /></View>
        <DashedLine style={styles.tearLine} />
        <View style={[styles.notchClip, styles.notchClipRight]}><View style={[styles.notch, styles.notchRight, cut]} /></View>
      </View>
      <View style={styles.ticketBottom}>
        <View style={styles.fact}>
          <Text style={styles.factLabel}>Berlaku hingga</Text>
          <Text style={styles.factValue} tabular>{voucher.ends_at ? formatDateShort(voucher.ends_at) : '—'}</Text>
        </View>
        <View style={styles.fact}>
          <Text style={styles.factLabel}>Min. transaksi</Text>
          <Text style={styles.factValue} tabular>{Number(voucher.min_subtotal) ? formatCurrency(voucher.min_subtotal) : '-'}</Text>
        </View>
        <Button title="Pakai" size="sm" onPress={() => onUse(voucher.code)} accessibilityLabel={`Pakai voucher ${voucher.code}`} style={styles.useButton} />
      </View>
    </View>
  )
}

function PromoCodeInput({ onSubmit }) {
  const styles = useStyles()
  const { COLORS } = useTheme()
  const [code, setCode] = useState('')
  return (
    <View style={styles.promo}>
      <TicketPercent size={24} color={COLORS.primary} />
      <TextInput
        value={code}
        onChangeText={(text) => setCode(text.toUpperCase())}
        placeholder="Punya kode promo? Masukkan di sini"
        placeholderTextColor={COLORS.placeholder}
        autoCapitalize="characters"
        maxLength={20}
        returnKeyType="done"
        onSubmitEditing={() => onSubmit(code)}
        accessibilityLabel="Kode promo"
        style={styles.promoInput}
      />
      {code.trim() ? <Button title="Pakai" size="sm" onPress={() => onSubmit(code)} /> : null}
    </View>
  )
}

/** Ringkasan poin member (tab kedua). */
function PointsPanel({ loyalty }) {
  const styles = useStyles()
  const { COLORS } = useTheme()
  const { brand } = useBrand()
  return (
    <View style={styles.points}>
      <View style={styles.pointsCard}>
        {brand.isGradient ? <LinearGradient colors={brand.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
        <Bubbles color={COLORS.textOnPrimary} opacity={0.1} scale={1.6} />
        <Sparkles size={22} color={COLORS.textOnPrimary} />
        <Text style={styles.pointsValue} tabular>{formatNumber(loyalty.balance)} poin</Text>
        <Text style={styles.pointsTier}>{loyalty.tier?.name ? `Member ${loyalty.tier.name}` : 'Member'}</Text>
        <Text style={styles.pointsHint}>{loyalty.next_tier ? `Belanja lagi untuk naik ke ${loyalty.next_tier.name}` : 'Tingkat tertinggi — terima kasih!'}</Text>
      </View>
      <Text tone="muted" size="sm">Poin bisa dipakai sebagai potongan di halaman checkout.</Text>
      <Button title="Lihat riwayat poin" variant="secondary" onPress={() => router.push('/loyalty')} />
    </View>
  )
}

export function VoucherCenter({ mode = 'tab' }) {
  const styles = useStyles()
  const { COLORS } = useTheme()
  const { cafe } = useBrand()
  const { session } = useAuth()
  const { vouchers, loading, error, reload } = useCafeVouchers(cafe?.id)
  const loyalty = useLoyaltyMe(cafe?.id)
  const [tab, setTab] = useState('vouchers')
  const use = useVoucherAction(mode)
  const tabs = loyalty && mode === 'tab' ? [{ value: 'vouchers', label: 'Voucher' }, { value: 'points', label: 'Poin saya' }] : null
  const showPoints = tabs && tab === 'points'

  return (
    <View style={styles.wrap}>
      <View style={styles.padded}><PromoCodeInput onSubmit={use} /></View>
      {tabs ? (
        <View style={styles.tabs} accessibilityRole="tablist">
          {tabs.map((item) => {
            const selected = item.value === tab
            return (
              <Pressable key={item.value} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setTab(item.value)} style={styles.tab}>
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{item.label}</Text>
                <View style={[styles.tabLine, selected && styles.tabLineSelected]} />
              </Pressable>
            )
          })}
        </View>
      ) : null}
      <View style={[styles.padded, styles.list]}>
        {showPoints ? <PointsPanel loyalty={loyalty} /> : (
          <>
            <SectionHeading title="Voucher Belanja" meta={vouchers.length ? `${vouchers.length} voucher` : null} dashed />
            {error ? <ErrorBox message={error} onRetry={reload} /> : null}
            {loading ? <LoadingState label="Memuat voucher..." /> : !vouchers.length ? (
              <EmptyState icon={TicketPercent} title="Belum ada promo" description="Promo dari kafe akan muncul di sini. Punya kode? Ketik di kolom atas." />
            ) : vouchers.map((voucher) => <VoucherTicket key={voucher.id} voucher={voucher} onUse={use} pageColor={mode === 'tab' ? COLORS.card : COLORS.canvas} />)}
            {!session && vouchers.some((voucher) => voucher.audience === 'members') ? (
              <Text tone="muted" size="sm" center>Voucher khusus member perlu masuk akun dulu.</Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  )
}

const useStyles = makeStyles(({ COLORS, SHADOW }) => ({
  wrap: { gap: 6 },
  padded: { paddingHorizontal: 16 },
  list: { gap: 18, paddingTop: 14 },
  promo: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingLeft: 20, paddingRight: 8,
    backgroundColor: COLORS.field, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 999,
  },
  promoInput: { flex: 1, minHeight: 52, padding: 0, color: COLORS.text, fontSize: 15 },
  tabs: { flexDirection: 'row', marginTop: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, alignItems: 'center', gap: 12, paddingTop: 10 },
  tabText: { color: COLORS.textMuted, fontSize: 15.5, fontWeight: '600' },
  tabTextSelected: { color: COLORS.primaryPressed, fontWeight: '800' },
  tabLine: { alignSelf: 'stretch', height: 3, marginBottom: -1, backgroundColor: 'transparent' },
  tabLineSelected: { backgroundColor: COLORS.primary },
  ticket: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.borderSubtle, borderRadius: 16, ...SHADOW.md },
  ticketTop: { flexDirection: 'row', gap: 12, overflow: 'hidden', padding: 18, paddingBottom: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  ticketText: { flex: 1, gap: 6 },
  ticketTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800', lineHeight: 23, letterSpacing: -0.2 },
  ticketTerms: { color: COLORS.textSecondary, fontSize: 13.5 },
  codeChip: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.primary, borderRadius: 8, backgroundColor: COLORS.primaryTint },
  codeText: { color: COLORS.primaryPressed, fontSize: 12.5, fontWeight: '800', letterSpacing: 1.1 },
  ticketArt: { width: 72, alignItems: 'flex-end' },
  ticketBadge: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 24, borderWidth: 4, borderColor: COLORS.primarySoft },
  tear: { height: 20, justifyContent: 'center' },
  tearLine: { marginHorizontal: 18 },
  notchClip: { position: 'absolute', top: 0, width: 11, height: 20, overflow: 'hidden' },
  notchClipLeft: { left: -1 },
  notchClipRight: { right: -1 },
  notch: { position: 'absolute', top: 0, width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderSubtle },
  notchLeft: { left: -10 },
  notchRight: { right: -10 },
  ticketBottom: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 16 },
  fact: { flex: 1, gap: 3 },
  factLabel: { color: COLORS.textMuted, fontSize: 12.5 },
  factValue: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  useButton: { minWidth: 96 },
  points: { gap: 14 },
  pointsCard: { overflow: 'hidden', gap: 4, padding: 20, backgroundColor: COLORS.primary, borderRadius: 20 },
  pointsValue: { marginTop: 6, color: COLORS.textOnPrimary, fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  pointsTier: { color: COLORS.textOnPrimary, fontSize: 15, fontWeight: '700' },
  pointsHint: { color: COLORS.onPrimaryMuted, fontSize: 13 },
}))
