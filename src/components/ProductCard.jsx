import { Pressable, View } from 'react-native'
import { Plus, Star, ThumbsUp } from 'lucide-react-native'
import { router } from 'expo-router'
import { formatCurrency, ProductImage } from './ui.jsx'
import { Text } from './ui/Text.jsx'
import { withAlpha } from '../theme/palette.js'
import { makeStyles, useTheme } from '../theme/useTheme.js'

/**
 * Kartu produk: foto persegi besar, badge di pojok, kategori, nama, harga, tombol + bulat.
 * badge: 'favorite' (paling disukai) | 'rating' (bintang) | null. Lebar diatur lewat `style`.
 */
export function ProductCard({ product, cafe, categoryName, badge = product.reviews ? 'rating' : null, style }) {
  const styles = useStyles()
  const { COLORS, STATUS_TONES } = useTheme()
  const open = () => router.push({ pathname: '/product/[id]', params: { id: product.id, cafeId: cafe.id } })
  const rating = Number(product.rating).toFixed(1).replace('.', ',')
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatCurrency(product.price)}${product.sold_out ? ', habis' : ''}`}
      onPress={open}
      style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        <ProductImage uri={product.image_url} style={[styles.image, product.sold_out && styles.soldOutImage]} iconSize={34} />
        {badge && !product.sold_out ? (
          <View style={styles.badge}>
            {badge === 'favorite'
              ? <ThumbsUp size={13} color={COLORS.primary} fill={COLORS.primary} />
              : <Star size={13} color={STATUS_TONES.amber.dot} fill={STATUS_TONES.amber.dot} />}
            <Text style={styles.badgeText}>{badge === 'favorite' ? 'Favorit' : rating}</Text>
          </View>
        ) : null}
        {product.sold_out ? <View style={styles.soldOut}><Text style={styles.soldOutText}>Habis</Text></View> : null}
      </View>
      <View style={styles.details}>
        {categoryName ? <Text style={styles.category} numberOfLines={1}>{categoryName}</Text> : null}
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={[styles.price, product.sold_out && styles.priceMuted]} tabular>{formatCurrency(product.price)}</Text>
        {!product.sold_out ? (
          <View style={styles.add} accessibilityElementsHidden importantForAccessibility="no">
            <Plus size={18} color={COLORS.textOnPrimary} strokeWidth={2.8} />
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

const useStyles = makeStyles(({ COLORS, SHADOW }) => ({
  card: { width: '48%', gap: 10 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  imageWrap: { position: 'relative', overflow: 'hidden', aspectRatio: 1, borderRadius: 18, backgroundColor: COLORS.sunken },
  image: { width: '100%', height: '100%', backgroundColor: COLORS.sunken },
  soldOutImage: { opacity: 0.45 },
  badge: {
    position: 'absolute', left: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, backgroundColor: withAlpha(COLORS.card, 0.94), borderRadius: 999, ...SHADOW.sm,
  },
  badgeText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  soldOut: { position: 'absolute', left: 10, top: 10, paddingHorizontal: 11, paddingVertical: 5, backgroundColor: COLORS.espresso, borderRadius: 999 },
  soldOutText: { color: COLORS.onDark, fontSize: 11, fontWeight: '800' },
  details: { flexGrow: 1, gap: 4 },
  category: { color: COLORS.textMuted, fontSize: 12.5 },
  name: { color: COLORS.text, fontSize: 15.5, fontWeight: '700', lineHeight: 21, letterSpacing: -0.2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, minHeight: 36 },
  price: { flexShrink: 1, color: COLORS.text, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  priceMuted: { color: COLORS.textMuted },
  add: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 18 },
}))
