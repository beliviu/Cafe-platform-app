/*
 * Kerangka tampilan ala aplikasi kedai modern: judul halaman di tengah, garis putus-putus,
 * judul seksi + jumlah, dekorasi gelembung, dan daftar baris selebar layar.
 * Semua warna dari tema aktif (warna brand owner + mode gelap/terang).
 */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useIsFocused } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { Text } from './ui/Text.jsx'
import { FONTS } from '../theme/tokens.js'
import { makeStyles, useTheme } from '../theme/useTheme.js'

/** Gaya status bar khusus layar ini, hanya selama layar tampil. */
export function FocusStatusBar({ style }) {
  const focused = useIsFocused()
  return focused ? <StatusBar style={style} /> : null
}

/** Judul halaman di tengah (tab Voucher, Pesanan, Akun). */
export function PageHeader({ title, onBack, right }) {
  const styles = useStyles()
  const { COLORS } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      <View style={styles.headerSide}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={onBack} hitSlop={10} style={styles.headerButton}>
            <ChevronLeft size={24} color={COLORS.text} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.headerTitle} accessibilityRole="header" numberOfLines={1}>{title}</Text>
      <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
    </View>
  )
}

/** Halaman tab: latar polos, judul di tengah, isi bisa digulir. */
export function TabPage({ title, headerRight, children, refreshControl, contentStyle, padded = true }) {
  const styles = useStyles()
  return (
    <View style={styles.page}>
      <PageHeader title={title} right={headerRight} />
      <ScrollView
        contentContainerStyle={[styles.pageContent, padded && styles.pagePadded, contentStyle]}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  )
}

/** Garis putus-putus (aman di iOS, Android, web). */
export function DashedLine({ color, style }) {
  const styles = useStyles()
  return (
    <View style={[styles.dashWrap, style]} accessibilityElementsHidden importantForAccessibility="no">
      <View style={[styles.dash, color ? { borderColor: color } : null]} />
    </View>
  )
}

/** Judul seksi tebal + info kecil di kanan ("7 item") atau aksi. */
export function SectionHeading({ title, meta, icon, action, onAction, dashed = false, style }) {
  const styles = useStyles()
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionRow}>
        <View style={styles.sectionTitleRow}>
          {icon}
          <Text style={styles.sectionTitle} accessibilityRole="header" numberOfLines={2}>{title}</Text>
        </View>
        {action ? (
          <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10}>
            <Text style={styles.sectionAction}>{action}</Text>
          </Pressable>
        ) : meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
      </View>
      {dashed ? <DashedLine /> : null}
    </View>
  )
}

const BUBBLES = [
  { size: 34, top: 14, right: 70 },
  { size: 14, top: 52, right: 42 },
  { size: 22, top: 74, right: 96 },
  { size: 10, top: 30, right: 24 },
]

/** Dekorasi gelembung samar di pojok kartu. */
export function Bubbles({ color, opacity = 0.12, scale = 1, items = BUBBLES }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no">
      {items.map((bubble, index) => (
        <View
          key={index}
          style={{
            position: 'absolute', top: bubble.top * scale, right: bubble.right * scale,
            width: bubble.size * scale, height: bubble.size * scale, borderRadius: bubble.size * scale,
            backgroundColor: color, opacity,
          }}
        />
      ))}
    </View>
  )
}

/** Pemisah seksi selebar layar (pita abu-abu tipis). */
export function Band() {
  const styles = useStyles()
  return <View style={styles.band} />
}

/** Baris daftar selebar layar: label, keterangan kecil, badge, panah. */
export function ListRow({ icon: Icon, title, detail, onPress, badge, right, danger = false, last = false }) {
  const styles = useStyles()
  const { COLORS } = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: COLORS.hover }]}
    >
      <View style={[styles.rowInner, !last && styles.rowDivider]}>
        {Icon ? <Icon size={20} color={danger ? COLORS.danger : COLORS.textSecondary} strokeWidth={1.9} /> : null}
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, danger && { color: COLORS.danger }]}>{title}</Text>
          {detail ? <Text style={styles.rowDetail} numberOfLines={2}>{detail}</Text> : null}
        </View>
        {badge ? <View style={styles.rowBadge}><Text style={styles.rowBadgeText} tabular>{badge > 99 ? '99+' : badge}</Text></View> : null}
        {right}
        {onPress ? <ChevronRight size={20} color={COLORS.text} strokeWidth={2.2} /> : null}
      </View>
    </Pressable>
  )
}

const useStyles = makeStyles(({ COLORS }) => ({
  page: { flex: 1, backgroundColor: COLORS.card },
  pageContent: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingBottom: 36 },
  pagePadded: { paddingHorizontal: 16, paddingTop: 8, gap: 18 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 14,
    backgroundColor: COLORS.card,
  },
  headerSide: { width: 48, minHeight: 32, justifyContent: 'center' },
  headerRight: { alignItems: 'flex-end' },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: COLORS.text, fontFamily: FONTS.sans, fontSize: 19, fontWeight: '800', letterSpacing: -0.2 },
  dashWrap: { height: 1, overflow: 'hidden' },
  dash: { height: 2, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, borderRadius: 1 },
  section: { gap: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { flexShrink: 1, color: COLORS.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.3, lineHeight: 25 },
  sectionMeta: { color: COLORS.textMuted, fontSize: 13 },
  sectionAction: { color: COLORS.primaryPressed, fontSize: 13, fontWeight: '700' },
  band: { height: 10, backgroundColor: COLORS.canvas },
  row: { paddingHorizontal: 16 },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
  rowDetail: { color: COLORS.textMuted, fontSize: 12 },
  rowBadge: { minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, borderRadius: 11, backgroundColor: COLORS.primary },
  rowBadgeText: { color: COLORS.textOnPrimary, fontSize: 11, fontWeight: '700' },
}))
