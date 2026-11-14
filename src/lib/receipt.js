/*
 * E-struk pelanggan: isi sama dengan struk kasir (Pengaturan → Struk di web owner).
 * buildReceipt() menyusun baris struk; receiptHtml() mengubahnya jadi HTML untuk diunduh (PDF).
 * Hanya membaca data — tidak menulis apa pun.
 */
import { Platform } from 'react-native'
import { formatDateTime, formatNumber, formatQueueNumber, formatRupiah } from './format.js'
import { paymentMethodLabel } from './status.js'

const ORDER_TYPE_LABEL = { dine_in: 'Makan di tempat', takeaway: 'Bawa pulang', delivery: 'Diantar' }

/** Setelan struk kafe (teks atas/bawah, logo, alamat). Kosong bila belum diatur. */
export async function fetchReceiptSettings(supabase, cafeId) {
  const { data, error } = await supabase.from('cafe_settings').select('*').eq('cafe_id', cafeId).maybeSingle()
  return error || !data ? {} : data
}

/** Susun isi struk dari pesanan, item, pembayaran, data kafe & setelan. */
export function buildReceipt({ order, items, payments = [], cafe = {}, brand = {}, settings = {} }) {
  const lines = []
  const add = (label, value, extra = {}) => lines.push({ label, value: formatNumber(Math.round(Number(value))), ...extra })
  if (order.subtotal_amount != null) {
    add('Subtotal', order.subtotal_amount)
    if (Number(order.discount_amount)) add(`Diskon${order.discount_reason ? ` (${order.discount_reason})` : ''}`, -Number(order.discount_amount))
    if (Number(order.voucher_discount)) add(`Voucher${order.voucher_code ? ` ${order.voucher_code}` : ''}`, -Number(order.voucher_discount))
    if (Number(order.points_discount)) add(`${order.points_redeemed || ''} poin`.trim(), -Number(order.points_discount))
    if (Number(order.service_charge_amount)) add('Service', order.service_charge_amount)
    if (Number(order.tax_amount)) add(settings.tax_name || 'Pajak', order.tax_amount)
    if (Number(order.rounding_amount)) add('Pembulatan', order.rounding_amount)
  }
  const paid = payments.filter((payment) => payment.status === 'paid')
  return {
    logoUrl: settings.receipt_show_logo !== false ? brand.logoUrl || null : null,
    name: brand.businessName || cafe.name || 'Kafe',
    address: settings.receipt_show_address !== false ? [cafe.address, cafe.phone].filter(Boolean).join(' · ') : '',
    header: settings.receipt_header || '',
    footer: settings.receipt_footer || '',
    queue: formatQueueNumber(order),
    date: formatDateTime(order.created_at),
    meta: [ORDER_TYPE_LABEL[order.order_type], order.table_label ? `Meja ${order.table_label}` : ''].filter(Boolean).join(' · '),
    items: items.map((item) => ({ key: item.id, label: `${item.quantity} × ${item.product_name}`, notes: item.notes || '', value: formatNumber(Math.round(Number(item.subtotal ?? item.price * item.quantity))) })),
    lines,
    total: formatRupiah(order.total_amount),
    payments: paid.map((payment) => ({ label: paymentMethodLabel(payment.method || payment.payment_method), value: formatNumber(Math.round(Number(payment.amount))) })),
    status: order.order_status === 'cancelled' ? 'DIBATALKAN' : order.payment_status === 'paid' ? 'LUNAS' : 'BELUM LUNAS',
  }
}

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
const row = (label, value, cls = '') => `<div class="row ${cls}"><span>${esc(label)}</span><span>${esc(value)}</span></div>`

export function receiptHtml(r) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Struk ${esc(r.queue)} - ${esc(r.name)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  body { max-width: 72mm; margin: 0 auto; padding: 8px; font: 12px/1.45 ui-monospace, Menlo, Consolas, monospace; color: #111; background: #fff; }
  .c { text-align: center; } .b { font-weight: 700; } .muted { color: #555; font-size: 11px; }
  .row { display: flex; justify-content: space-between; gap: 8px; } .row span:last-child { white-space: nowrap; }
  .sep { margin: 8px 0; border-top: 1px dashed #777; }
  .total { font-weight: 700; font-size: 13px; }
  img { max-width: 56px; max-height: 56px; display: block; margin: 0 auto 6px; border-radius: 8px; }
</style></head><body>
  ${r.logoUrl ? `<img src="${esc(r.logoUrl)}" alt="">` : ''}
  <div class="c b">${esc(r.name)}</div>
  ${r.address ? `<div class="c muted">${esc(r.address)}</div>` : ''}
  ${r.header ? `<div class="c muted">${esc(r.header)}</div>` : ''}
  <div class="sep"></div>
  ${row(r.queue, r.date)}
  ${r.meta ? `<div class="muted">${esc(r.meta)}</div>` : ''}
  <div class="sep"></div>
  ${r.items.map((item) => row(item.label, item.value) + (item.notes ? `<div class="muted">  · ${esc(item.notes)}</div>` : '')).join('')}
  <div class="sep"></div>
  ${r.lines.map((line) => row(line.label, line.value)).join('')}
  ${row('TOTAL', r.total, 'total')}
  ${r.payments.map((payment) => row(payment.label, payment.value)).join('')}
  <div class="sep"></div>
  <div class="c b">${esc(r.status)}</div>
  ${r.footer ? `<div class="c muted" style="margin-top:6px">${esc(r.footer)}</div>` : ''}
</body></html>`
}

/** Unduh e-struk: web → jendela cetak (Simpan sebagai PDF); HP → dialog cetak/simpan PDF sistem. */
export async function downloadReceipt(receipt) {
  const html = receiptHtml(receipt)
  if (Platform.OS === 'web') {
    const win = window.open('', '_blank', 'width=420,height=720')
    if (!win) throw new Error('Popup diblokir browser. Izinkan popup lalu coba lagi.')
    win.document.write(html.replace('</body>', `<script>window.onload = () => setTimeout(() => window.print(), 300)</${'script'}></body>`))
    win.document.close()
    return
  }
  const Print = await import('expo-print')
  await Print.printAsync({ html })
}
