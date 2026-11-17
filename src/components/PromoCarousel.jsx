import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, AppState, FlatList, Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { ArrowRight } from 'lucide-react-native'
import { Text } from './ui/Text.jsx'
import { withAlpha } from '../theme/palette.js'
import { makeStyles, useTheme } from '../theme/useTheme.js'

function openDestination(banner, cafeId) {
  if (banner.destination_type === 'product' && banner.destination_id) {
    router.push({ pathname: '/product/[id]', params: { id: banner.destination_id, cafeId } })
    return
  }
  if (banner.destination_type === 'category' && banner.destination_id) {
    router.push({ pathname: '/menu', params: { categoryId: banner.destination_id } })
    return
  }
  if (banner.destination_type === 'vouchers') {
    router.push('/(tabs)/voucher')
    return
  }
  if (banner.destination_type === 'custom' && banner.destination_path?.startsWith('/') && !banner.destination_path.startsWith('//')) {
    router.push(banner.destination_path)
    return
  }
  router.push('/menu')
}

/** Lapisan gelap agar teks (dan status bar pada mode hero) selalu terbaca di atas foto apa pun. */
function Scrim({ hero }) {
  const { COLORS } = useTheme()
  if (hero) {
    return (
      <LinearGradient
        colors={[withAlpha(COLORS.espresso, 0.55), withAlpha(COLORS.espresso, 0), withAlpha(COLORS.espresso, 0.2), withAlpha(COLORS.espresso, 0.88)]}
        locations={[0, 0.26, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
    )
  }
  return (
    <LinearGradient
      colors={[withAlpha(COLORS.espresso, 0.92), withAlpha(COLORS.espresso, 0.62), withAlpha(COLORS.espresso, 0.08)]}
      locations={[0, 0.62, 1]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={StyleSheet.absoluteFill}
    />
  )
}

function BannerSlide({ banner, cafeId, cafeName, width, height, hero, overlap }) {
  const styles = useStyles()
  const { COLORS } = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${banner.title}${banner.cta_label ? `, ${banner.cta_label}` : ''}`}
      onPress={() => openDestination(banner, cafeId)}
      style={[styles.slide, hero && styles.heroSlide, { width, height }]}
    >
      {banner.image_url ? <Image source={{ uri: banner.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={220} /> : null}
      <Scrim hero={hero} />
      <View style={[styles.copy, hero && [styles.heroCopy, { bottom: overlap + 34 }]]}>
        <Text style={styles.kicker}>{cafeName}</Text>
        <Text style={styles.title} numberOfLines={2}>{banner.title}</Text>
        {banner.subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{banner.subtitle}</Text> : null}
        {banner.cta_label ? (
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{banner.cta_label}</Text>
            <ArrowRight size={14} color={COLORS.textOnPrimary} />
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

/**
 * Carousel promo. hero = selebar layar tanpa sudut membulat, tingginya ikut lebar layar,
 * dan `overlap` px bagian bawahnya akan ditutup kartu sapaan (teks & titik dinaikkan).
 */
export function PromoCarousel({ banners, cafe, product, error, onRetry, hero = false, overlap = 0 }) {
  const styles = useStyles()
  const { COLORS } = useTheme()
  const listRef = useRef(null)
  const [width, setWidth] = useState(0)
  const [activeBannerId, setActiveBannerId] = useState(null)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [appActive, setAppActive] = useState(AppState.currentState === 'active')
  const pauseUntil = useRef(0)
  const index = Math.max(0, banners.findIndex((banner) => banner.id === activeBannerId))
  const height = hero
    ? Math.min(460, Math.max(300, Math.round(width * 0.86)))
    : Math.min(232, Math.max(184, Math.round(width / 1.72)))

  useEffect(() => {
    let active = true
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled)
    })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => {
      active = false
      subscription.remove()
    }
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setAppActive(state === 'active'))
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (banners.length < 2 || !width || reduceMotion || !appActive) return undefined
    const timer = setInterval(() => {
      if (Date.now() < pauseUntil.current) return
      const next = (index + 1) % banners.length
      setActiveBannerId(banners[next].id)
      listRef.current?.scrollToOffset({ offset: next * width, animated: true })
    }, 5000)
    return () => clearInterval(timer)
  }, [appActive, banners, index, reduceMotion, width])

  function pauseAutoPlay() {
    pauseUntil.current = Date.now() + 12000
  }

  function renderBanner({ item }) {
    return <BannerSlide banner={item} cafeId={cafe.id} cafeName={cafe.name} width={width} height={height} hero={hero} overlap={overlap} />
  }

  return (
    <View style={[styles.wrap, hero && styles.heroWrap]} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {banners.length ? (
        <>
          <FlatList
            ref={listRef}
            data={banners}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={renderBanner}
            getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
            onScrollBeginDrag={pauseAutoPlay}
            onTouchStart={pauseAutoPlay}
            onMomentumScrollEnd={(event) => {
              if (!width) return
              const next = Math.min(banners.length - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / width)))
              setActiveBannerId(banners[next]?.id || null)
            }}
          />
          {banners.length > 1 ? (
            <View style={[styles.indicators, hero && [styles.heroIndicators, { bottom: overlap + 14 }]]} accessibilityLabel="Pilih banner promosi">
              {banners.map((banner, dotIndex) => (
                <Pressable
                  key={banner.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Banner ${dotIndex + 1} dari ${banners.length}`}
                  accessibilityState={{ selected: dotIndex === index }}
                  onPress={() => {
                    pauseAutoPlay()
                    setActiveBannerId(banner.id)
                    listRef.current?.scrollToOffset({ offset: dotIndex * width, animated: !reduceMotion })
                  }}
                  hitSlop={8}
                  style={[styles.dot, hero && styles.heroDot, dotIndex === index && (hero ? styles.heroDotActive : styles.dotActive)]}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Jelajahi menu ${cafe.name}`}
          onPress={() => product
            ? router.push({ pathname: '/product/[id]', params: { id: product.id, cafeId: cafe.id } })
            : router.push('/menu')}
          style={[styles.slide, hero ? styles.heroSlide : styles.fallback, { height }]}
        >
          {product?.image_url ? <Image source={{ uri: product.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={220} /> : null}
          <Scrim hero={hero} />
          <View style={[styles.copy, hero && [styles.heroCopy, { bottom: overlap + 34 }]]}>
            <Text style={styles.kicker}>{cafe.name}</Text>
            <Text style={styles.title} numberOfLines={2}>{product?.name || cafe.tagline || 'Temukan menu andalan kami'}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>{product?.description || cafe.description || `Minuman dan camilan pilihan dari ${cafe.name}.`}</Text>
            <View style={styles.cta}>
              <Text style={styles.ctaText}>{product ? 'Lihat menu' : 'Jelajahi menu'}</Text>
              <ArrowRight size={14} color={COLORS.textOnPrimary} />
            </View>
          </View>
        </Pressable>
      )}
      {error && !hero ? <Text style={styles.error} accessibilityRole="alert">{error} {onRetry ? <Text onPress={onRetry} style={styles.retry}>Coba lagi</Text> : null}</Text> : null}
    </View>
  )
}

const useStyles = makeStyles(({ COLORS }) => ({
  wrap: { gap: 10 },
  heroWrap: { gap: 0 },
  heroSlide: { borderRadius: 0, justifyContent: 'flex-end' },
  heroCopy: { position: 'absolute', left: 0, width: '86%', paddingHorizontal: 20, paddingVertical: 0 },
  heroIndicators: { position: 'absolute', left: 0, right: 0 },
  heroDot: { backgroundColor: withAlpha(COLORS.onDark, 0.45) },
  heroDotActive: { width: 8, height: 8, backgroundColor: COLORS.onDark, borderRadius: 4 },
  slide: { position: 'relative', overflow: 'hidden', justifyContent: 'center', backgroundColor: COLORS.espresso, borderRadius: 22 },
  fallback: { borderWidth: 1, borderColor: withAlpha(COLORS.onDark, 0.14) },
  copy: { alignItems: 'flex-start', gap: 9, width: '78%', paddingHorizontal: 21, paddingVertical: 20 },
  kicker: { color: COLORS.navAccent, fontSize: 9, fontWeight: '800', letterSpacing: 1.25, textTransform: 'uppercase' },
  title: { color: COLORS.onDark, fontFamily: 'PlusJakartaSans', fontSize: 27, fontWeight: '700', lineHeight: 31, letterSpacing: -0.5 },
  subtitle: { maxWidth: 310, color: withAlpha(COLORS.onDark, 0.82), fontSize: 12, lineHeight: 18 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36, marginTop: 2, paddingHorizontal: 13, backgroundColor: COLORS.primary, borderRadius: 18 },
  ctaText: { color: COLORS.textOnPrimary, fontSize: 11, fontWeight: '800' },
  indicators: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 12 },
  dot: { width: 6, height: 6, backgroundColor: COLORS.borderStrong, borderRadius: 3 },
  dotActive: { width: 20, backgroundColor: COLORS.primary, borderRadius: 4 },
  error: { color: COLORS.danger, fontSize: 11, lineHeight: 16 },
  retry: { color: COLORS.primaryPressed, fontWeight: '800', textDecorationLine: 'underline' },
}))
