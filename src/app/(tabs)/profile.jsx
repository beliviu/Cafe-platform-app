import { useCallback, useEffect, useState } from 'react'
import { router } from 'expo-router'
import { Linking, Pressable, StyleSheet, View } from 'react-native'
import Constants from 'expo-constants'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronRight, MapPin, MessageCircle, Sparkles } from 'lucide-react-native'
import { useAuth } from '../../auth/useAuth.js'
import { useBrand } from '../../brand/useBrand.js'
import { Button, ErrorBox, Field, LoadingState, SegmentedControl } from '../../components/ui.jsx'
import { Text } from '../../components/ui/Text.jsx'
import { Band, Bubbles, ListRow, TabPage } from '../../components/AppChrome.jsx'
import { useLoyaltyMe, whatsappNumber } from '../../components/useCustomerPerks.js'
import { useCafeStatus } from '../../lib/customer.js'
import { useNotifications } from '../../lib/useNotifications.js'
import { unregisterPush } from '../../lib/push.js'
import { formatNumber, initials } from '../../lib/format.js'
import { withAlpha } from '../../theme/palette.js'
import { makeStyles, useTheme } from '../../theme/useTheme.js'
import { THEME_PREFERENCES } from '../../brand/BrandProvider.jsx'

/** Kartu identitas berwarna brand di puncak halaman Akun. */
function ProfileCard({ name, detail, onPress, accessibilityLabel }) {
  const styles = useStyles()
  const { COLORS } = useTheme()
  const { brand } = useBrand()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [styles.profile, pressed && styles.pressed]}>
      {brand.isGradient ? <LinearGradient colors={brand.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
      <Bubbles color={COLORS.textOnPrimary} opacity={0.1} scale={1.3} items={[{ size: 40, top: 10, right: 140 }, { size: 26, top: 54, right: 96 }, { size: 16, top: 18, right: 64 }, { size: 12, top: 82, right: 160 }]} />
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(name) || '?'}</Text>
      </View>
      <View style={styles.profileText}>
        <Text style={styles.profileName} numberOfLines={1}>{name}</Text>
        {detail ? <Text style={styles.profileDetail} numberOfLines={1}>{detail}</Text> : null}
      </View>
      <ChevronRight size={24} color={COLORS.textOnPrimary} strokeWidth={2.4} />
    </Pressable>
  )
}

/** Kartu sorotan di bawah profil (seperti kartu program member). */
function HighlightCard({ title, caption, onPress }) {
  const styles = useStyles()
  const { COLORS } = useTheme()
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.highlight, pressed && styles.pressed]}>
      <View style={styles.highlightArt}>
        <Bubbles color={COLORS.accentText} opacity={0.12} items={[{ size: 22, top: -4, right: -2 }, { size: 10, top: 40, right: 44 }]} />
        <Sparkles size={30} color={COLORS.accentText} strokeWidth={1.8} />
      </View>
      <View style={styles.highlightText}>
        <Text style={styles.highlightTitle}>{title}</Text>
        <Text style={styles.highlightCaption} numberOfLines={2}>{caption}</Text>
      </View>
    </Pressable>
  )
}

function SectionTitle({ title, caption }) {
  const styles = useStyles()
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
    </View>
  )
}

export default function ProfileScreen() {
  const styles = useStyles()
  const { COLORS, STATUS_TONES, preference, setPreference } = useTheme()
  const { session, supabase, isGuest } = useAuth()
  const { cafe, brand } = useBrand()
  const { status } = useCafeStatus(cafe)
  const notifications = useNotifications({ limit: 30 })
  const loyalty = useLoyaltyMe(cafe?.id)
  const [fullName, setFullName] = useState('')
  const [savedName, setSavedName] = useState('')
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(Boolean(session))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const member = Boolean(session) && !isGuest
  const phase4 = Boolean(status?.live)
  const whatsapp = whatsappNumber(cafe?.phone)
  const version = Constants.expoConfig?.version

  const loadProfile = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
    if (queryError) setError(`Profil gagal dimuat: ${queryError.message}`)
    else {
      setFullName(data?.full_name || '')
      setSavedName(data?.full_name || '')
    }
    setLoading(false)
  }, [session, supabase])

  useEffect(() => {
    const timer = setTimeout(loadProfile, 0)
    return () => clearTimeout(timer)
  }, [loadProfile])

  async function saveProfile() {
    const name = fullName.trim()
    if (!name) return setError('Nama wajib diisi.')
    setSaving(true)
    setError('')
    setSuccess('')
    const { data, error: updateError } = await supabase.from('profiles').update({ full_name: name }).eq('id', session.user.id).select('id').maybeSingle()
    if (updateError) setError(`Profil gagal disimpan: ${updateError.message}`)
    else if (!data) setError('Profil tidak diperbarui. Periksa sesi lalu coba lagi.')
    else {
      setSavedName(name)
      setSuccess('Profil berhasil diperbarui.')
      setEditing(false)
    }
    setSaving(false)
    return undefined
  }

  async function signOut() {
    setError('')
    await unregisterPush(supabase)
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError(`Tidak dapat keluar: ${signOutError.message}`)
  }

  const openUrl = (url) => Linking.openURL(url).catch(() => {})
  const displayName = member ? (savedName || session.user.user_metadata?.full_name || 'Pelanggan') : isGuest ? 'Tamu' : 'Halo, tamu!'

  return (
    <TabPage title="Akun" padded={false}>
      <View style={styles.top}>
        {member ? (
          <ProfileCard name={displayName} detail={session.user.email} accessibilityLabel={editing ? 'Tutup ubah profil' : 'Ubah profil'} onPress={() => { setEditing((open) => !open); setSuccess('') }} />
        ) : (
          <ProfileCard name={displayName} detail={isGuest ? 'Masuk untuk kumpulkan poin & voucher' : 'Masuk atau daftar untuk mulai'} accessibilityLabel="Masuk atau daftar" onPress={() => router.push('/login')} />
        )}
        {member && loading ? <LoadingState label="Memuat profil..." /> : null}
        {member && editing ? (
          <View style={styles.editCard}>
            <Text weight="800">Data diri</Text>
            <Text size="sm" tone="muted">{session.user.email}</Text>
            <ErrorBox message={error} />
            <Field label="Nama lengkap" value={fullName} onChangeText={setFullName} placeholder="Nama kamu" />
            <Button title="Simpan profil" onPress={saveProfile} loading={saving} />
          </View>
        ) : null}
        {success ? <Text weight="700" size="sm" style={{ color: COLORS.primaryPressed }}>{success}</Text> : null}
        {!editing && error ? <ErrorBox message={error} /> : null}
        {isGuest ? (
          <Text size="xs" tone="muted">Pesanan dari meja tetap bisa dilihat di tab Pesanan selama memakai HP/browser ini. Setelah masuk ke akun, pesanan tamu sebelumnya tidak ikut pindah.</Text>
        ) : null}
        {member && loyalty ? (
          <HighlightCard title="Poin & Member" caption={`${formatNumber(loyalty.balance)} poin${loyalty.tier?.name ? ` · ${loyalty.tier.name}` : ''} — tukar jadi potongan saat checkout`} onPress={() => router.push('/loyalty')} />
        ) : null}
      </View>

      {member ? (
        <>
          <Band />
          <View>
            {phase4 ? <ListRow title="Wishlist" detail="Menu favorit yang kamu simpan" onPress={() => router.push('/wishlist')} /> : null}
            {phase4 ? <ListRow title="Riwayat Pembayaran" detail="Pembayaran & pengembalian dana" onPress={() => router.push('/payments')} /> : null}
            {notifications.available ? <ListRow title="Notifikasi" badge={notifications.unread || null} onPress={() => router.push('/notifications')} /> : null}
            {phase4 ? <ListRow title="Pusat Bantuan" detail="Tanya atau laporkan masalah ke kafe" onPress={() => router.push('/support')} /> : null}
            <ListRow title="Ubah Profil" onPress={() => setEditing(true)} last />
          </View>
        </>
      ) : null}

      <Band />
      <View style={styles.block}>
        <SectionTitle title="Tampilan" caption="Warna mengikuti brand kafe. Pilih gelap, terang, atau ikuti pengaturan HP." />
        <SegmentedControl options={THEME_PREFERENCES} value={preference} onChange={setPreference} />
      </View>

      {whatsapp || cafe?.address ? (
        <>
          <Band />
          <View style={styles.block}>
            <SectionTitle title="Butuh Bantuan?" caption={`Tim ${brand.businessName} siap membantu`} />
            {whatsapp ? (
              <Pressable accessibilityRole="link" onPress={() => openUrl(`https://wa.me/${whatsapp}`)} style={({ pressed }) => [styles.contact, pressed && styles.pressed]}>
                <View style={[styles.contactIcon, { backgroundColor: STATUS_TONES.green.bg }]}><MessageCircle size={22} color={STATUS_TONES.green.fg} strokeWidth={2.2} /></View>
                <Text style={styles.contactText} numberOfLines={1}>Chat {brand.businessName} (WhatsApp)</Text>
                <ChevronRight size={20} color={COLORS.text} />
              </Pressable>
            ) : null}
            {cafe?.address ? (
              <Pressable accessibilityRole="link" onPress={() => openUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cafe.address)}`)} style={({ pressed }) => [styles.contact, pressed && styles.pressed]}>
                <View style={[styles.contactIcon, { backgroundColor: COLORS.primarySoft }]}><MapPin size={22} color={COLORS.primaryPressed} strokeWidth={2.2} /></View>
                <View style={styles.contactBody}>
                  <Text style={styles.contactText} numberOfLines={1}>Lokasi kafe</Text>
                  <Text style={styles.contactCaption} numberOfLines={2}>{cafe.address}</Text>
                </View>
                <ChevronRight size={20} color={COLORS.text} />
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}

      <Band />
      <View style={styles.footer}>
        <Text style={styles.version}>{version ? `Versi ${version}` : brand.name}</Text>
        {session ? (
          <Pressable accessibilityRole="button" onPress={signOut} hitSlop={10}>
            <Text style={styles.logout}>{isGuest ? 'Keluar mode tamu' : 'Logout'}</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => router.push('/login')} hitSlop={10}>
            <Text style={styles.login}>Masuk</Text>
          </Pressable>
        )}
      </View>
    </TabPage>
  )
}

const useStyles = makeStyles(({ COLORS, SHADOW }) => ({
  pressed: { opacity: 0.92 },
  top: { gap: 16, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 22 },
  profile: {
    overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 112, paddingHorizontal: 20, paddingVertical: 18,
    backgroundColor: COLORS.primary, borderRadius: 20,
  },
  avatar: {
    width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: 34,
    backgroundColor: withAlpha(COLORS.textOnPrimary, 0.92), borderWidth: 3, borderColor: withAlpha(COLORS.textOnPrimary, 0.4),
  },
  avatarText: { color: COLORS.primary, fontSize: 22, fontWeight: '800' },
  profileText: { flex: 1, gap: 4 },
  profileName: { color: COLORS.textOnPrimary, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  profileDetail: { color: COLORS.onPrimaryMuted, fontSize: 13.5, fontWeight: '600' },
  editCard: { gap: 12, padding: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, ...SHADOW.sm },
  highlight: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.borderSubtle, borderRadius: 18, ...SHADOW.md,
  },
  highlightArt: { width: 72, height: 72, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft, borderRadius: 16 },
  highlightText: { flex: 1, gap: 4 },
  highlightTitle: { color: COLORS.primaryPressed, fontSize: 17, fontWeight: '800' },
  highlightCaption: { color: COLORS.textSecondary, fontSize: 13.5 },
  block: { gap: 14, paddingHorizontal: 16, paddingVertical: 22 },
  sectionHead: { gap: 4 },
  sectionTitle: { color: COLORS.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  sectionCaption: { color: COLORS.textMuted, fontSize: 13.5 },
  contact: {
    flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.borderSubtle, borderRadius: 16, ...SHADOW.md,
  },
  contactIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  contactBody: { flex: 1, gap: 2 },
  contactText: { flexShrink: 1, flexGrow: 1, color: COLORS.text, fontSize: 15, fontWeight: '700' },
  contactCaption: { color: COLORS.textMuted, fontSize: 12.5 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 22 },
  version: { color: COLORS.textMuted, fontSize: 14 },
  logout: { color: COLORS.danger, fontSize: 15, fontWeight: '800' },
  login: { color: COLORS.primaryPressed, fontSize: 15, fontWeight: '800' },
}))
