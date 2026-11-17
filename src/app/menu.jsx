import { useMemo, useState } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, ChevronRight, Search, ShoppingBag, Star, Store, TicketPercent, X } from 'lucide-react-native'
import { useCafeProducts } from '../components/useCafeData.js'
import { useBrand } from '../brand/useBrand.js'
import { ProductCard } from '../components/ProductCard.jsx'
import { EmptyState, ErrorBox, formatCurrency, LoadingState } from '../components/ui.jsx'
import { Text } from '../components/ui/Text.jsx'
import { Bubbles, FocusStatusBar, SectionHeading } from '../components/AppChrome.jsx'
import { ORDER_TYPE_LABELS, useCafeVouchers, useOrderTypes } from '../components/useCustomerPerks.js'
import { useCart } from '../cart/useCart.js'
import { CafeStatusPill, TableBanner } from '../components/CustomerBits.jsx'
import { useCafeStatus } from '../lib/customer.js'
import { withAlpha } from '../theme/palette.js'
import { makeStyles, useTheme } from '../theme/useTheme.js'

const MAX_WIDTH = 760

function goBack() {
  if (router.canGoBack()) router.back()
  else router.replace('/(tabs)')
}

/** Pil Bawa Pulang | Makan di Sini di header. */
function OrderTypeToggle({ types, value, onChange }) {
  const styles = useStyles()
  return (
    <View style={styles.toggle} accessibilityRole="radiogroup" accessibilityLabel="Cara pesan">
      {types.map((type) => {
        const selected = type === value
        return (
          <Pressable key={type} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => onChange(type)}
            style={[styles.toggleOption, selected && styles.toggleSelected]}>
            <Text style={[styles.toggleText, selected && styles.toggleTextSelected]}>{ORDER_TYPE_LABELS[type].title}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Strip promo voucher yang bisa digeser. */
function VoucherStrip({ vouchers, width }) {
  const styles = useStyles()
  const { COLORS } = useTheme()
  const [active, setActive] = useState(0)
  if (!vouchers.length || !width) return null
  const step = width + 12
  return (
    <View style={styles.stripWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        onMomentumScrollEnd={(event) => setActive(Math.round(event.nativeEvent.contentOffset.x / step))}
        contentContainerStyle={styles.stripList}
      >
        {vouchers.map((voucher) => (
          <Pressable key={voucher.id} accessibilityRole="button" onPress={() => router.push('/(tabs)/voucher')} style={[styles.strip, { width }]}>
            <View style={styles.stripIcon}><TicketPercent size={22} color={COLORS.accentText} /></View>
            <View style={styles.stripText}>
              <Text style={styles.stripTitle} numberOfLines={1}>{voucher.name}</Text>
              <Text style={styles.stripCaption} numberOfLines={1}>
                {Number(voucher.min_subtotal) ? `Min. transaksi ${formatCurrency(voucher.min_subtotal)}. ` : ''}S&K berlaku
              </Text>
            </View>
            <ChevronRight size={20} color={COLORS.text} />
          </Pressable>
        ))}
      </ScrollView>
      {vouchers.length > 1 ? (
        <View style={styles.stripDots}>
          {vouchers.map((voucher, index) => <View key={voucher.id} style={[styles.stripDot, index === active && styles.stripDotActive]} />)}
        </View>
      ) : null}
    </View>
  )
}

function CartBar() {
  const styles = useStyles()
  const { COLORS } = useTheme()
  const insets = useSafeAreaInsets()
  const { brand } = useBrand()
  const { itemCount, subtotal } = useCart()
  if (!itemCount) return null
  return (
    <View style={[styles.cartBarWrap, { bottom: insets.bottom + 12 }]} pointerEvents="box-none">
      <Pressable accessibilityRole="button" accessibilityLabel={`Lihat keranjang, ${itemCount} item`} onPress={() => router.push('/cart')}
        style={({ pressed }) => [styles.cartBar, pressed && styles.pressed]}>
        {brand.isGradient ? <LinearGradient colors={brand.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
        <View style={styles.cartBarText}>
          <Text style={styles.cartBarCount}>{itemCount} item</Text>
          <Text style={styles.cartBarTotal} tabular>Perkiraan {formatCurrency(subtotal)}</Text>
        </View>
        <View style={styles.cartBarAction}>
          <Text style={styles.cartBarCta}>Keranjang</Text>
          <ShoppingBag size={18} color={COLORS.textOnPrimary} strokeWidth={2.3} />
        </View>
      </Pressable>
    </View>
  )
}

export default function MenuScreen() {
  const styles = useStyles()
  const { COLORS, STATUS_TONES, dark } = useTheme()
  const insets = useSafeAreaInsets()
  const { width: windowWidth } = useWindowDimensions()
  const { categoryId: requestedCategory } = useLocalSearchParams()
  const { cafe, brand, loading: cafeLoading, error: cafeError, reload } = useBrand()
  const { itemCount, table, setTable, orderType, setOrderType } = useCart()
  const { status } = useCafeStatus(cafe)
  const orderTypes = useOrderTypes(cafe?.id)
  const { vouchers } = useCafeVouchers(cafe?.id)
  const { products, categories, loading, error, reload: reloadMenu } = useCafeProducts(cafe?.id)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const contentWidth = Math.min(windowWidth, MAX_WIDTH) - 32
  const headerInk = dark ? COLORS.text : COLORS.textOnPrimary
  const activeType = orderTypes.includes(orderType) ? orderType : orderTypes[0]

  const categoryId = typeof requestedCategory === 'string' && categories.some((category) => category.id === requestedCategory)
    ? requestedCategory
    : 'all'
  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories])

  const sections = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (query) {
      const found = products.filter((product) => `${product.name} ${product.description || ''}`.toLowerCase().includes(query))
      return [{ key: 'search', title: `Hasil untuk "${search.trim()}"`, items: found }]
    }
    const grouped = categories
      .map((category) => ({ key: category.id, title: category.name, items: products.filter((product) => product.category_id === category.id) }))
      .filter((section) => section.items.length)
    const other = products.filter((product) => !categoryNames.has(product.category_id))
    if (other.length) grouped.push({ key: 'other', title: grouped.length ? 'Lainnya' : 'Semua menu', items: other })
    if (categoryId !== 'all') return grouped.filter((section) => section.key === categoryId)
    const picks = products
      .filter((product) => Number(product.reviews) > 0 && !product.sold_out)
      .sort((left, right) => Number(right.rating) - Number(left.rating) || Number(right.reviews) - Number(left.reviews))
      .slice(0, 6)
    return picks.length ? [{ key: 'picks', title: 'Wajib Coba!', star: true, favorite: true, items: picks }, ...grouped] : grouped
  }, [categories, categoryId, categoryNames, products, search])

  function selectCategory(id) {
    router.setParams({ categoryId: id === 'all' ? '' : id })
  }

  const header = (
    <View style={styles.headerWrap}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        {!dark && brand.isGradient ? <LinearGradient colors={brand.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
        <Bubbles color={headerInk} opacity={0.07} scale={2.4} items={[{ size: 60, top: 6, right: 120 }, { size: 30, top: 40, right: 8 }, { size: 18, top: 62, right: 70 }]} />
        <View style={styles.headerBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={goBack} hitSlop={8} style={styles.headerButton}>
            <ChevronLeft size={26} color={headerInk} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: headerInk }]} numberOfLines={1} accessibilityRole="header">{brand.name}</Text>
          <View style={styles.headerButton} />
        </View>
        {table ? (
          <View style={styles.tablePill}>
            <Text style={styles.toggleTextSelected}>Makan di Sini · Meja {table.label}</Text>
          </View>
        ) : orderTypes.length > 1 ? (
          <OrderTypeToggle types={orderTypes} value={activeType} onChange={setOrderType} />
        ) : null}
        <Text style={[styles.headerCaption, { color: withAlpha(headerInk, 0.86) }]}>
          {table ? 'Pesanan diantar ke mejamu' : ORDER_TYPE_LABELS[activeType].caption}
        </Text>
      </View>
      <View style={styles.storeWrap}>
      <Pressable
        accessibilityRole={cafe?.address ? 'button' : 'text'}
        accessibilityLabel={cafe?.address ? `${brand.businessName}, buka lokasi di peta` : brand.businessName}
        disabled={!cafe?.address}
        onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cafe.address)}`).catch(() => {})}
        style={styles.storeCard}
      >
        <View style={styles.storeIcon}><Store size={24} color={COLORS.primaryPressed} /></View>
        <View style={styles.storeDivider} />
        <View style={styles.storeText}>
          <Text style={styles.storeName} numberOfLines={1}>{brand.businessName}</Text>
          <Text style={styles.storeMeta} numberOfLines={1}>{cafe?.address || brand.tagline || 'Pesan, ambil, nikmati'}</Text>
        </View>
        {cafe?.address ? <ChevronRight size={22} color={COLORS.text} /> : null}
      </Pressable>
      </View>
    </View>
  )

  const chips = (
    <View style={styles.chipBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
        <Pressable accessibilityRole="button" accessibilityLabel="Semua menu" accessibilityState={{ selected: categoryId === 'all' }}
          onPress={() => selectCategory('all')} style={[styles.chip, styles.starChip, categoryId === 'all' && styles.chipSelected]}>
          <Star size={20} color={STATUS_TONES.amber.dot} fill={STATUS_TONES.amber.dot} />
        </Pressable>
        {categories.map((category) => (
          <Pressable key={category.id} accessibilityRole="button" accessibilityState={{ selected: categoryId === category.id }}
            onPress={() => selectCategory(category.id)} style={[styles.chip, categoryId === category.id && styles.chipSelected]}>
            <Text style={[styles.chipText, categoryId === category.id && styles.chipTextSelected]}>{category.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityLabel={searchOpen ? 'Tutup pencarian' : 'Cari menu'}
        onPress={() => { setSearchOpen((open) => !open); if (searchOpen) setSearch('') }}
        style={[styles.chip, styles.searchChip, searchOpen && styles.chipSelected]}>
        {searchOpen ? <X size={20} color={COLORS.text} /> : <Search size={20} color={COLORS.text} />}
      </Pressable>
    </View>
  )

  let content
  if (cafeLoading) content = <LoadingState label="Memuat kafe..." />
  else if (cafeError) content = <ErrorBox message={cafeError} onRetry={reload} />
  else if (!cafe) content = <EmptyState title="Belum ada cafe" description="Cafe akan tampil setelah tersedia di database." />
  else if (loading) content = <LoadingState label="Memuat menu..." />
  else if (error) content = <ErrorBox message={error} onRetry={reloadMenu} />
  else if (!sections.length || !sections.some((section) => section.items.length)) {
    content = <EmptyState title="Menu tidak ditemukan" description="Coba kata pencarian atau kategori lain." />
  } else {
    content = sections.map((section) => (
      <View key={section.key} style={styles.section}>
        <SectionHeading
          dashed
          title={section.title}
          meta={`${section.items.length} item`}
          icon={section.star ? <Star size={22} color={STATUS_TONES.amber.dot} fill={STATUS_TONES.amber.dot} /> : null}
        />
        <View style={styles.grid}>
          {section.items.map((product, index) => (
            <ProductCard key={product.id} product={product} cafe={cafe} categoryName={categoryNames.get(product.category_id)}
              badge={section.favorite && index < 2 ? 'favorite' : undefined} />
          ))}
        </View>
      </View>
    ))
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <FocusStatusBar style="light" />
      <ScrollView stickyHeaderIndices={[1]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: itemCount ? insets.bottom + 110 : insets.bottom + 32 }}>
        {header}
        {chips}
        <View style={styles.body}>
          {searchOpen ? (
            <View style={styles.searchWrap}>
              <Search size={18} color={COLORS.textMuted} />
              <TextInput value={search} onChangeText={setSearch} autoFocus placeholder="Cari kopi, pastry..." placeholderTextColor={COLORS.placeholder}
                accessibilityLabel="Cari menu" returnKeyType="search" style={styles.searchInput} />
            </View>
          ) : null}
          <TableBanner table={table} onClear={() => setTable(null)} />
          {status?.label ? <CafeStatusPill status={status} /> : null}
          {!searchOpen ? <VoucherStrip vouchers={vouchers.slice(0, 5)} width={contentWidth} /> : null}
          {content}
        </View>
      </ScrollView>
      <CartBar />
    </View>
  )
}

const useStyles = makeStyles(({ COLORS, SHADOW, dark }) => ({
  screen: { flex: 1, backgroundColor: COLORS.card },
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  headerWrap: { backgroundColor: COLORS.card },
  header: {
    overflow: 'hidden', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 62,
    backgroundColor: dark ? COLORS.primarySoft : COLORS.primary,
  },
  headerBar: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  toggle: { flexDirection: 'row', padding: 4, backgroundColor: COLORS.card, borderRadius: 999 },
  toggleOption: { minHeight: 44, minWidth: 128, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, borderRadius: 999, borderWidth: 2, borderColor: 'transparent' },
  toggleSelected: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary },
  toggleText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  toggleTextSelected: { color: COLORS.primaryPressed, fontSize: 15, fontWeight: '800' },
  tablePill: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: COLORS.card, borderRadius: 999 },
  headerCaption: { fontSize: 14, fontWeight: '600' },
  storeWrap: { marginTop: -46, paddingHorizontal: 16 },
  storeCard: {
    width: '100%', maxWidth: MAX_WIDTH - 32, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.borderSubtle, borderRadius: 20, ...SHADOW.md,
  },
  storeIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryTint, borderRadius: 26 },
  storeDivider: { width: 1, alignSelf: 'stretch', marginVertical: 2, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border },
  storeText: { flex: 1, gap: 3 },
  storeName: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  storeMeta: { color: COLORS.textMuted, fontSize: 13 },
  chipBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.card },
  chipScroll: { flex: 1 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
  chip: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 999, backgroundColor: COLORS.card },
  starChip: { paddingHorizontal: 22 },
  searchChip: { width: 46, paddingHorizontal: 0 },
  chipSelected: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  chipTextSelected: { color: COLORS.primaryPressed, fontWeight: '800' },
  body: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 16, gap: 22 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 16,
    backgroundColor: COLORS.field, borderWidth: 1, borderColor: COLORS.border, borderRadius: 25,
  },
  searchInput: { flex: 1, height: '100%', padding: 0, color: COLORS.text, fontSize: 14 },
  stripWrap: { gap: 10 },
  stripList: { gap: 12 },
  strip: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: COLORS.primaryTint, borderWidth: 1, borderColor: COLORS.primarySoft, borderRadius: 16,
  },
  stripIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft, borderRadius: 21 },
  stripText: { flex: 1, gap: 3 },
  stripTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  stripCaption: { color: COLORS.textSecondary, fontSize: 12.5 },
  stripDots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  stripDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.borderStrong },
  stripDotActive: { width: 18, backgroundColor: COLORS.primary },
  section: { gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 24 },
  cartBarWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  cartBar: {
    width: '100%', maxWidth: MAX_WIDTH - 32, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 12,
    minHeight: 62, paddingHorizontal: 20, backgroundColor: COLORS.primary, borderRadius: 999, ...SHADOW.lg,
  },
  cartBarText: { flex: 1, gap: 1 },
  cartBarCount: { color: COLORS.textOnPrimary, fontSize: 15, fontWeight: '800' },
  cartBarTotal: { color: COLORS.onPrimaryMuted, fontSize: 12.5 },
  cartBarAction: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartBarCta: { color: COLORS.textOnPrimary, fontSize: 15, fontWeight: '800' },
}))
