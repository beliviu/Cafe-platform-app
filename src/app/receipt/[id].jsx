import { useEffect, useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { Platform, View } from 'react-native'
import { Image } from 'expo-image'
import { Download } from 'lucide-react-native'
import { useAuth } from '../../auth/useAuth.js'
import { useBrand } from '../../brand/useBrand.js'
import { Button, ErrorBox, LoadingState, Screen, useToast } from '../../components/ui.jsx'
import { Text } from '../../components/ui/Text.jsx'
import { orderDetailSelect } from '../../lib/orders.js'
import { buildReceipt, downloadReceipt, fetchReceiptSettings } from '../../lib/receipt.js'
import { makeStyles } from '../../theme/useTheme.js'

/* E-struk pesanan customer: tampil seperti struk kasir & bisa diunduh sebagai PDF. */
export default function ReceiptScreen() {
  const styles = useStyles()
  const { id } = useLocalSearchParams()
  const { session, supabase } = useAuth()
  const { cafe, brand } = useBrand()
  const { toast } = useToast()
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!session) return undefined
    let alive = true
    ;(async () => {
      const { data: order, error: orderError } = await supabase.from('orders')
        .select(await orderDetailSelect(supabase, 'id, cafe_id, order_number, total_amount, order_status, payment_status, payment_method, created_at'))
        .eq('id', id).eq('customer_id', session.user.id).maybeSingle()
      if (!alive) return
      if (orderError || !order) {
        setError(orderError ? `Struk gagal dimuat: ${orderError.message}` : 'Pesanan tidak ditemukan di akun ini.')
        return
      }
      const [items, payments, settings] = await Promise.all([
        supabase.from('order_items').select('id, product_name, price, quantity, subtotal, notes').eq('order_id', order.id).order('created_at'),
        supabase.from('payments').select('id, method, payment_method, status, amount').eq('order_id', order.id),
        fetchReceiptSettings(supabase, order.cafe_id),
      ])
      if (!alive) return
      if (items.error) return setError(`Rincian struk gagal dimuat: ${items.error.message}`)
      setReceipt(buildReceipt({ order, items: items.data || [], payments: payments.data || [], cafe: cafe || {}, brand, settings }))
    })()
    return () => { alive = false }
  }, [brand, cafe, id, session, supabase])

  async function download() {
    setBusy(true)
    try {
      await downloadReceipt(receipt)
    } catch (caught) {
      toast({ tone: 'error', title: 'Struk gagal diunduh', description: caught.message })
    } finally {
      setBusy(false)
    }
  }

  if (!session) return <Screen><ErrorBox message="Masuk ke akun customer untuk melihat struk." /><Button title="Masuk" onPress={() => router.push('/login')} /></Screen>
  if (error) return <Screen><ErrorBox message={error} /><Button title="Kembali" variant="secondary" onPress={() => router.back()} /></Screen>
  if (!receipt) return <Screen><LoadingState label="Menyiapkan e-struk..." /></Screen>

  return (
    <Screen>
      <View style={styles.paper} accessibilityLabel={`E-struk ${receipt.queue}`}>
        {receipt.logoUrl ? <Image source={{ uri: receipt.logoUrl }} style={styles.logo} contentFit="contain" /> : null}
        <Mono weight="700" center size={14}>{receipt.name}</Mono>
        {receipt.address ? <Mono muted center>{receipt.address}</Mono> : null}
        {receipt.header ? <Mono muted center>{receipt.header}</Mono> : null}
        <Sep />
        <Row label={receipt.queue} value={receipt.date} />
        {receipt.meta ? <Mono muted>{receipt.meta}</Mono> : null}
        <Sep />
        {receipt.items.map((item) => (
          <View key={item.key}>
            <Row label={item.label} value={item.value} />
            {item.notes ? <Mono muted>  · {item.notes}</Mono> : null}
          </View>
        ))}
        <Sep />
        {receipt.lines.map((line) => <Row key={line.label} label={line.label} value={line.value} />)}
        <Row label="TOTAL" value={receipt.total} strong />
        {receipt.payments.map((payment, index) => <Row key={`${payment.label}-${index}`} label={payment.label} value={payment.value} />)}
        <Sep />
        <Mono weight="700" center>{receipt.status}</Mono>
        {receipt.footer ? <Mono muted center style={{ marginTop: 6 }}>{receipt.footer}</Mono> : null}
      </View>
      <Button title="Unduh e-struk (PDF)" icon={Download} loading={busy} onPress={download} />
      <Text size="xs" tone="muted" center>Pilih “Simpan sebagai PDF” pada dialog yang muncul.</Text>
    </Screen>
  )
}

function Mono({ children, muted, center, weight = '400', size = 12, style }) {
  const styles = useStyles()
  return <Text weight={weight} style={[styles.mono, { fontSize: size }, muted && styles.muted, center && { textAlign: 'center' }, style]}>{children}</Text>
}

function Row({ label, value, strong }) {
  const styles = useStyles()
  return (
    <View style={styles.row}>
      <Mono weight={strong ? '700' : '400'} size={strong ? 13 : 12} style={{ flex: 1 }}>{label}</Mono>
      <Mono weight={strong ? '700' : '400'} size={strong ? 13 : 12}>{value}</Mono>
    </View>
  )
}

function Sep() {
  const styles = useStyles()
  return <View style={styles.sep} />
}

// Kertas struk selalu terang (seperti struk asli), terlepas dari mode gelap/terang app.
const useStyles = makeStyles(() => ({
  paper: { alignSelf: 'center', width: '100%', maxWidth: 360, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 26, backgroundColor: '#FBFAF6', borderRadius: 4, gap: 3 },
  logo: { width: 56, height: 56, alignSelf: 'center', marginBottom: 8, borderRadius: 8 },
  mono: { color: '#1A1714', fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), lineHeight: 19 },
  muted: { color: '#5E5850', fontSize: 11 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  sep: { marginVertical: 7, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#8A8378' },
}))
