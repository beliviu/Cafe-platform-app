import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Bell, Heart, ShieldCheck, ShoppingBag, Sparkles, Star, TicketPercent, UserRound, UtensilsCrossed } from 'lucide-react-native'
import { useCafeProducts } from '../../components/useCafeData.js'
import { BrandMark } from '../../brand/BrandMark.jsx'
import { useBrand } from '../../brand/useBrand.js'
import { ProductCard } from '../../components/ProductCard.jsx'
import { PromoCarousel } from '../../components/PromoCarousel.jsx'
import { useCafePromotions } from '../../components/useCafePromotions.js'
import { ORDER_TYPE_LABELS, useCafeVouchers, useLoyaltyMe, useOrderTypes } from '../../components/useCustomerPerks.js'
import { Bubbles, DashedLine, FocusStatusBar, SectionHeading } from '../../components/AppChrome.jsx'
import { EmptyState, ErrorBox, LoadingState } from '../../components/ui.jsx'
import { Text } from '../../components/ui/Text.jsx'
import { useCart } from '../../cart/useCart.js'
import { useAuth } from '../../auth/useAuth.js'
import { CafeStatusPill, TableBanner } from '../../components/CustomerBits.jsx'
import { useCafeStatus } from '../../lib/customer.js'
import { useNotifications } from '../../lib/useNotifications.js'
import { formatNumber, greetingForNow } from '../../lib/format.js'
import { withAlpha } from '../../theme/palette.js'
import { makeStyles, useTheme } from '../../theme/useTheme.js'

const OVERLAP = 64

/** Tombol bulat gelap di atas banner (notifikasi, keranjang). */
function FloatingButton({ icon: Icon, label, badge, onPress }) {
  const styles = useStyles()
  const { COLORS } = useTheme()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.floating, pressed && styles.pressed]}>
      <Icon size={21} color={COLORS.onDark} strokeWidth={2.2} />
      {badge ? (
        <View style={styles.floatingBadge} accessibilityElementsHidden importantForAccessibility="no">
          <Text style={styles.floatingBadgeText} tabular>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  )
}

/** Chip bulat di kartu sapaan ("120 Poin", "3 Voucher"). */
function PerkChip({ icon: Icon, label, onPress }) {
  const styles = useStyles()
  const { COLORS } = useTheme()
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
      <View style={styles.chipIcon}><Icon size={16} color={COLORS.primaryPressed} strokeWidth={2.2} /></View>
      <Text style={styles.chipText} numberOfLines={1}>{label}</Text>
    </Pressable>
  )
}

/** Kartu besar pilihan cara pesan (bawa pulang / makan di sini). */
function OrderModeCard({ type, tone, onPress, wide }) {
  const styles = useStyles()
  const { COLORS } = useTheme()
  const palette = tone === 'accent'
    ? { main: COLORS.accent, title: COLORS.accentText, soft: COLORS.accentSoft, tint: COLORS.accentSoft }
    : { main: COLORS.primary, title: COLORS.primaryPressed, soft: COLORS.primarySoft, tint: COLORS.primaryTint }
  const Icon = type === 'dine_in' ? UtensilsCrossed : ShoppingBag
  const copy = ORDER_TYPE_LABELS[type]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${copy.title}. ${copy.caption}`}
      onPress={onPress}
      style={({ pressed }) => [styles.mode, { borderColor: palette.main }, wide && styles.modeWide, pressed && styles.pressed]}
    >
      <LinearGradient colors={[palette.tint, COLORS.card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Bubbles color={palette.main} opacity={0.14} items={[{ size: 26, top: 14, right: 44 }, { size: 12, top: 44, right: 22 }, { size: 9, top: 22, right: 12 }]} />
      <Text style={[styles.modeTitle, { color: palette.title }]}>{copy.title}</Text>
      <Text style={styles.modeCaption}>{copy.caption}</Text>
      <View style={[styles.modeArt, { backgroundColor: palette.soft }]}>
        <Icon size={34} color={palette.title} strokeWidth={1.8} />
      </View>
    </Pressable>
  )
}

/** Kartu pintasan di "Spesial untukmu". */
function FeatureTile({ icon: Icon, title, caption, onPress, tone = 'brand' }) {
  const styles = useStyles()
  const { COLORS } = useTheme()
  const soft = tone === 'accent' ? COLORS.accentSoft : COLORS.primarySoft
  const ink = tone === 'accent' ? COLORS.accentText : COLORS.primaryPressed
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <View style={[styles.tileArt, { backgroundColor: soft }]}>
        <Bubbles color={ink} opacity={0.1} items={[{ size: 40, top: -8, right: -6 }, { size: 16, top: 52, right: 18 }]} />
        <Icon size={40} color={ink} strokeWidth={1.6} />
      </View>
      <Text style={styles.tileTitle} numberOfLines={1}>{title}</Text>
      {caption ? <Text style={styles.tileCaption} numberOfLines={1}>{caption}</Text> : null}
    </Pressable>
  )
}

function GreetingCard({ firstName, loyalty, voucherCount, status }) {
  const styles = useStyles()
  const { COLORS } = useTheme()
  const { session, isGuest } = useAuth()
  const [greeting] = useState(() => greetingForNow())
  const member = session && !isGuest
  return (
    <View style={styles.greetCard}>
      <View style={styles.greetTop}>
        <View style={styles.greetText}>
          <Text style={styles.greetHello} numberOfLines={1}>Hai {firstName || (member ? 'kamu' : 'Kak')}!</Text>
          <Text style={styles.greetSub} numberOfLines={1}>{greeting}, mau ngopi apa hari ini?</Text>
        </View>
        <View style={styles.greetArt} accessibilityElementsHidden importantForAccessibility="no">
          <View style={[styles.coin, styles.coinBig]}><Star size={16} color={COLORS.onPrimaryMuted} fill={COLORS.onPrimaryMuted} /></View>
          <View style={[styles.coin, styles.coinSmall]}><Star size={10} color={COLORS.onPrimaryMuted} fill={COLORS.onPrimaryMuted} /></View>
          <Sparkles size={14} color={COLORS.accent} style={styles.sparkA} />
          <Sparkles size={10} color={COLORS.primary} style={styles.sparkB} />
        </View>
      </View>
      {status?.label ? <CafeStatusPill status={status} /> : null}
      <DashedLine />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {member ? (
          loyalty ? <PerkChip icon={Sparkles} label={`${formatNumber(loyalty.balance)} Poin`} onPress={() => router.push('/loyalty')} /> : null
        ) : (
          <PerkChip icon={UserRound} label="Masuk / Daftar" onPress={() => router.push('/login')} />
        )}
        <PerkChip icon={TicketPercent} label={voucherCount ? `${voucherCount} Voucher` : 'Voucher'} onPress={() => router.push('/(tabs)/voucher')} />
        {member && loyalty?.tier?.name ? <PerkChip icon={Star} label={loyalty.tier.name} onPress={() => router.push('/loyalty')} /> : null}
      </ScrollView>
    </View>
  )
}

export default function HomeScreen() {
  const styles = useStyles()
  const { STATUS_TONES } = useTheme()
  const insets = useSafeAreaInsets()
  const { session } = useAuth()
  const firstName = (session?.user?.user_metadata?.full_name || '').trim().split(/\s+/)[0]
  const { cafe, brand, loading, error, reload } = useBrand()
  const { itemCount, table, setTable, setOrderType } = useCart()
  const { status } = useCafeStatus(cafe)
  const notifications = useNotifications({ limit: 30 })
  const menu = useCafeProducts(cafe?.id)
  const promotions = useCafePromotions(cafe?.id)
  const { vouchers } = useCafeVouchers(cafe?.id)
  const loyalty = useLoyaltyMe(cafe?.id)
  const orderTypes = useOrderTypes(cafe?.id)
  const fallbackProduct = menu.products.find((product) => product.image_url && !product.sold_out)
  const categoryNames = new Map(menu.categories.map((category) => [category.id, category.name]))
  const rated = menu.products
    .filter((product) => Number(product.reviews) > 0 && !product.sold_out)
    .sort((left, right) => Number(right.rating) - Number(left.rating) || Number(right.reviews) - Number(left.reviews))
  const featured = (rated.length ? rated : menu.products.filter((product) => !product.sold_out)).slice(0, 8)

  function startOrder(type) {
    setOrderType(type)
    router.push('/menu')
  }

  return (
    <View style={styles.screen}>
      <FocusStatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View>
          <PromoCarousel
            hero
            overlap={OVERLAP}
            banners={promotions.banners}
            cafe={{ id: cafe?.id, name: brand.businessName, tagline: brand.tagline, description: cafe?.description }}
            product={fallbackProduct}
            error={promotions.error}
            onRetry={promotions.reload}
          />
          <View style={[styles.heroBar, { top: insets.top + 8 }]} pointerEvents="box-none">
            <View style={styles.heroBrand}>
              <BrandMark size={30} />
              <Text style={styles.heroBrandName} numberOfLines={1}>{brand.name}</Text>
            </View>
            <View style={styles.heroActions}>
              {notifications.available ? (
                <FloatingButton icon={Bell} label={notifications.unread ? `Notifikasi, ${notifications.unread} belum dibaca` : 'Notifikasi'} badge={notifications.unread} onPress={() => router.push('/notifications')} />
              ) : null}
              <FloatingButton icon={ShoppingBag} label={itemCount > 0 ? `Keranjang, ${itemCount} item` : 'Keranjang'} badge={itemCount} onPress={() => router.push('/cart')} />
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <GreetingCard firstName={firstName} loyalty={loyalty} voucherCount={vouchers.length} status={status} />
          {promotions.error ? <ErrorBox message={promotions.error} onRetry={promotions.reload} /> : null}
          <TableBanner table={table} onClear={() => setTable(null)} />

          {loading ? <LoadingState label="Memuat kafe..." /> : error ? <ErrorBox message={error} onRetry={reload} /> : !cafe ? (
            <EmptyState title="Belum ada cafe" description="Cafe akan tampil di sini setelah tersedia di database." />
          ) : (
            <>
              <View style={styles.block}>
                <SectionHeading title={`Pesan ${brand.name} sekarang?`} />
                <View style={styles.modes}>
                  {(table ? ['dine_in'] : orderTypes).map((type, index) => (
                    <OrderModeCard key={type} type={type} tone={index === 0 ? 'brand' : 'accent'} wide={table || orderTypes.length === 1} onPress={() => startOrder(type)} />
                  ))}
                </View>
              </View>

              <View style={styles.block}>
                <SectionHeading title={`Spesial untukmu di ${brand.name}`} />
                <View style={styles.tiles}>
                  <FeatureTile icon={TicketPercent} title="Voucher Belanja" caption={vouchers.length ? `${vouchers.length} promo tersedia` : 'Cek promo terbaru'} onPress={() => router.push('/(tabs)/voucher')} />
                  {loyalty ? (
                    <FeatureTile icon={Sparkles} tone="accent" title="Poin & Member" caption={`${formatNumber(loyalty.balance)} poin`} onPress={() => router.push('/loyalty')} />
                  ) : (
                    <FeatureTile icon={Heart} tone="accent" title="Wishlist" caption="Menu favoritmu" onPress={() => router.push(session ? '/wishlist' : '/login')} />
                  )}
                </View>
              </View>

              <View style={styles.block}>
                <SectionHeading
                  title={rated.length ? 'Favorit pelanggan' : 'Wajib coba'}
                  icon={<Star size={20} color={STATUS_TONES.amber.dot} fill={STATUS_TONES.amber.dot} />}
                  action="Lihat semua"
                  onAction={() => router.push('/menu')}
                />
                {menu.loading ? <LoadingState label="Memuat menu pilihan..." /> : menu.error ? <ErrorBox message={menu.error} onRetry={menu.reload} /> : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featured}>
                    {featured.map((product, index) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        cafe={cafe}
                        categoryName={categoryNames.get(product.category_id)}
                        badge={rated.length && index < 2 ? 'favorite' : undefined}
                        style={styles.featuredCard}
                      />
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.note}>
                <ShieldCheck size={16} color={brand.colors.primary} />
                <Text style={styles.noteText}>Harga dan total pesanan selalu diverifikasi sistem kafe saat checkout.</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const useStyles = makeStyles(({ COLORS, SHADOW }) => ({
  screen: { flex: 1, backgroundColor: COLORS.card },
  scroll: { paddingBottom: 32 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  heroBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroBrand: {
    flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, paddingRight: 12, paddingVertical: 4,
    backgroundColor: withAlpha(COLORS.espresso, 0.5), borderRadius: 999,
  },
  heroBrandName: { flexShrink: 1, color: COLORS.onDark, fontSize: 13, fontWeight: '800' },
  heroActions: { flexDirection: 'row', gap: 10 },
  floating: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(COLORS.espresso, 0.72), borderRadius: 22,
  },
  floatingBadge: {
    position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, paddingHorizontal: 5,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.card,
  },
  floatingBadgeText: { color: COLORS.textOnPrimary, fontSize: 10, fontWeight: '800', lineHeight: 13 },
  body: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16, gap: 26 },
  greetCard: {
    marginTop: -OVERLAP, gap: 14, padding: 18, paddingBottom: 16, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.borderSubtle, borderRadius: 20, ...SHADOW.md,
  },
  greetTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greetText: { flex: 1, gap: 4 },
  greetHello: { color: COLORS.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  greetSub: { color: COLORS.textMuted, fontSize: 13 },
  greetArt: { width: 84, height: 52 },
  coin: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryMid, borderWidth: 3, borderColor: COLORS.primarySoft },
  coinBig: { right: 6, top: 10, width: 38, height: 38, borderRadius: 19 },
  coinSmall: { right: 46, top: 22, width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
  sparkA: { position: 'absolute', right: 0, top: 0 },
  sparkB: { position: 'absolute', left: 6, top: 6 },
  chips: { flexDirection: 'row', gap: 10, paddingRight: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingLeft: 6, paddingRight: 16,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, backgroundColor: COLORS.card,
  },
  chipPressed: { backgroundColor: COLORS.hover },
  chipIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primarySoft, borderRadius: 16 },
  chipText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  block: { gap: 14 },
  modes: { flexDirection: 'row', gap: 12 },
  mode: { flex: 1, minHeight: 168, overflow: 'hidden', padding: 16, gap: 6, borderWidth: 1.5, borderRadius: 18, backgroundColor: COLORS.card },
  modeWide: { minHeight: 140 },
  modeTitle: { fontSize: 21, fontWeight: '800', letterSpacing: -0.4 },
  modeCaption: { maxWidth: '70%', color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 },
  modeArt: { position: 'absolute', right: 12, bottom: 12, width: 66, height: 66, alignItems: 'center', justifyContent: 'center', borderRadius: 33 },
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, gap: 4, padding: 10, paddingBottom: 14, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.borderSubtle, borderRadius: 18, ...SHADOW.sm },
  tileArt: { height: 104, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderRadius: 14 },
  tileTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  tileCaption: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },
  featured: { gap: 14, paddingRight: 16 },
  featuredCard: { width: 158 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
  noteText: { flex: 1, color: COLORS.textMuted, fontSize: 12 },
}))
