import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, View } from 'react-native'
import { router } from 'expo-router'
import { ShoppingBag, Smartphone, UtensilsCrossed } from 'lucide-react-native'
import { useAuth } from '../../auth/useAuth.js'
import { useBrand } from '../../brand/useBrand.js'
import { useCart } from '../../cart/useCart.js'
import { Button, EmptyState, ErrorBox, formatCurrency, LoadingState, OrderStatusBadge, PaymentBadge, ProductImage, useToast } from '../../components/ui.jsx'
import { Text } from '../../components/ui/Text.jsx'
import { DashedLine, TabPage } from '../../components/AppChrome.jsx'
import { formatDateShort, formatQueueNumber, formatTime } from '../../lib/format.js'
import { orderDetailSelect } from '../../lib/orders.js'
import { buildReorder } from '../../lib/reorder.js'
import { ACTIVE_ORDER_STATUSES } from '../../lib/status.js'
import { makeStyles, useTheme } from '../../theme/useTheme.js'

let ordersChannelSequence = 0

/** Item pertama + foto produk tiap pesanan (dua query, bukan satu per pesanan). */
async function loadOrderItems(supabase, orderIds) {
  if (!orderIds.length) return new Map()
  const { data: items } = await supabase.from('order_items')
    .select('order_id, product_id, product_name, quantity, created_at')
    .in('order_id', orderIds)
    .order('created_at')
  const productIds = [...new Set((items || []).map((item) => item.product_id).filter(Boolean))]
  const { data: products } = productIds.length
    ? await supabase.from('products').select('id, image_url').in('id', productIds)
    : { data: [] }
  const images = new Map((products || []).map((product) => [product.id, product.image_url]))
  const byOrder = new Map()
  for (const item of items || []) {
    const list = byOrder.get(item.order_id) || []
    list.push({ ...item, image_url: images.get(item.product_id) || null })
    byOrder.set(item.order_id, list)
  }
  return byOrder
}

function OrderCard({ order, items, cafeName, onReorder, reordering }) {
  const styles = useStyles()
  const { COLORS } = useTheme()
  const active = ACTIVE_ORDER_STATUSES.includes(order.order_status)
  const dineIn = order.order_type === 'dine_in' || Boolean(order.table_label)
  const Icon = dineIn ? UtensilsCrossed : ShoppingBag
  const typeLabel = dineIn ? `Makan di sini${order.table_label ? ` · Meja ${order.table_label}` : ''}` : 'Bawa pulang'
  const first = items[0]
  const quantity = items.reduce((total, item) => total + Number(item.quantity || 0), 0)
  return (
    <View style={styles.card}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Pesanan ${formatQueueNumber(order)}, ${typeLabel}`} onPress={() => router.push(`/order/${order.id}`)}
      style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}>
      <View style={styles.top}>
        <View style={styles.typeIcon}><Icon size={22} color={COLORS.primaryPressed} strokeWidth={1.9} /></View>
        <View style={styles.topText}>
          <Text style={styles.type} numberOfLines={1}>{typeLabel}</Text>
          <Text style={styles.date} tabular>{formatDateShort(order.created_at)} {formatTime(order.created_at)} · {formatQueueNumber(order)}</Text>
        </View>
        <OrderStatusBadge status={order.order_status} dot={false} />
      </View>
      <View style={styles.divider} />
      <View style={styles.itemRow}>
        <ProductImage uri={first?.image_url} style={styles.thumb} iconSize={20} />
        <View style={styles.itemText}>
          <Text style={styles.itemName} numberOfLines={1}>{first?.product_name || 'Pesanan'}</Text>
          {items.length > 1 ? <Text style={styles.itemMore}>+{items.length - 1} produk lainnya</Text> : first ? <Text style={styles.itemMore}>×{first.quantity}</Text> : null}
        </View>
      </View>
      <DashedLine />
      <View style={styles.storeRow}>
        <Text style={styles.store} numberOfLines={1}>{cafeName}</Text>
        <View style={styles.via}>
          <PaymentBadge status={order.payment_status} size="sm" />
          <Smartphone size={18} color={COLORS.textMuted} />
        </View>
      </View>
    </Pressable>
      <View style={styles.divider} />
      <View style={styles.bottom}>
        <Text style={styles.summary} tabular>{quantity ? `${quantity} item  •  ` : ''}{formatCurrency(order.total_amount)}</Text>
        {active ? (
          <Button title="Lacak" size="sm" onPress={() => router.push(`/order/${order.id}`)} style={styles.action} />
        ) : order.order_status === 'completed' ? (
          <Button title="Beli Lagi" size="sm" variant="outline" loading={reordering} onPress={() => onReorder(order)} style={styles.action} />
        ) : null}
      </View>
    </View>
  )
}

export default function OrdersScreen() {
  const styles = useStyles()
  const { COLORS } = useTheme()
  const { session, supabase } = useAuth()
  const { brand } = useBrand()
  const { replaceLines } = useCart()
  const { toast } = useToast()
  const [orders, setOrders] = useState([])
  const [itemsByOrder, setItemsByOrder] = useState(new Map())
  const [loading, setLoading] = useState(Boolean(session))
  const [refreshing, setRefreshing] = useState(false)
  const [reorderingId, setReorderingId] = useState(null)
  const [error, setError] = useState('')

  const loadOrders = useCallback(async () => {
    if (!session) return
    setError('')
    const { data, error: queryError } = await supabase.from('orders')
      .select(await orderDetailSelect(supabase, 'id, cafe_id, order_number, total_amount, order_status, payment_status, payment_method, created_at'))
      .eq('customer_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    if (queryError) setError(`Riwayat pesanan gagal dimuat: ${queryError.message}`)
    else {
      setOrders(data || [])
      setItemsByOrder(await loadOrderItems(supabase, (data || []).map((order) => order.id)))
    }
    setLoading(false)
  }, [session, supabase])

  useEffect(() => {
    const timer = setTimeout(loadOrders, 0)
    return () => clearTimeout(timer)
  }, [loadOrders])

  useEffect(() => {
    if (!session) return undefined
    const channel = supabase.channel(`customer-orders-${session.user.id}-${++ordersChannelSequence}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `customer_id=eq.${session.user.id}`,
      }, loadOrders)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadOrders, session, supabase])

  async function refresh() {
    setRefreshing(true)
    await loadOrders()
    setRefreshing(false)
  }

  async function reorder(order) {
    setReorderingId(order.id)
    try {
      const result = await buildReorder(supabase, order.id, brand.businessName)
      if (!result.lines.length) {
        toast({ tone: 'error', title: 'Menu pesanan ini sedang tidak tersedia', description: result.changes.join(' · ') })
        return
      }
      replaceLines(result.lines)
      toast({
        tone: result.changes.length ? 'info' : 'success',
        title: `${result.lines.length} menu masuk keranjang`,
        description: result.changes.length ? result.changes.join(' · ') : 'Harga sudah disesuaikan dengan harga terkini.',
      })
      router.push('/cart')
    } catch (caught) {
      toast({ tone: 'error', title: 'Gagal memesan ulang', description: caught.message })
    } finally {
      setReorderingId(null)
    }
  }

  return (
    <TabPage
      title="Riwayat Pesanan"
      refreshControl={session ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} colors={[COLORS.primary]} /> : undefined}
    >
      {!session ? (
        <EmptyState title="Masuk untuk melihat pesanan" description="Pesanan dan statusnya tersimpan di akunmu." action={<Button title="Masuk" onPress={() => router.push('/login')} />} />
      ) : loading ? <LoadingState label="Memuat pesanan..." /> : error ? <ErrorBox message={error} onRetry={loadOrders} /> : !orders.length ? (
        <EmptyState title="Belum ada pesanan" description="Pesanan pertamamu akan muncul di sini." action={<Button title="Lihat menu" onPress={() => router.push('/menu')} />} />
      ) : (
        <View style={styles.list}>
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} items={itemsByOrder.get(order.id) || []} cafeName={brand.businessName}
              onReorder={reorder} reordering={reorderingId === order.id} />
          ))}
        </View>
      )}
    </TabPage>
  )
}

const useStyles = makeStyles(({ COLORS, SHADOW }) => ({
  list: { gap: 16 },
  card: { gap: 14, padding: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.borderSubtle, borderRadius: 20, ...SHADOW.md },
  cardMain: { gap: 14 },
  pressed: { opacity: 0.7 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryTint, borderRadius: 24 },
  topText: { flex: 1, gap: 3 },
  type: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  date: { color: COLORS.textMuted, fontSize: 13 },
  divider: { height: 1, backgroundColor: COLORS.borderSubtle },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  thumb: { width: 60, height: 60, borderRadius: 12 },
  itemText: { flex: 1, gap: 4 },
  itemName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  itemMore: { color: COLORS.textSecondary, fontSize: 13.5 },
  storeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  store: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '700' },
  via: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summary: { flex: 1, color: COLORS.textSecondary, fontSize: 14.5 },
  action: { minWidth: 112 },
}))
