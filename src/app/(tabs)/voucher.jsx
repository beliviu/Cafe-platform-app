import { TabPage } from '../../components/AppChrome.jsx'
import { VoucherCenter } from '../../components/VoucherCenter.jsx'

/** Tab Voucher: kode promo, voucher kafe, dan poin member. */
export default function VoucherTab() {
  return (
    <TabPage title="Voucher" padded={false}>
      <VoucherCenter mode="tab" />
    </TabPage>
  )
}
