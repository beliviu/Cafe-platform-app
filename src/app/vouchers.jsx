import { ScrollView, View } from 'react-native'
import { VoucherCenter } from '../components/VoucherCenter.jsx'
import { makeStyles } from '../theme/useTheme.js'

/** Pilih voucher dari checkout: tombol Pakai menyimpan kode lalu kembali, checkout memakainya otomatis. */
export default function VouchersScreen() {
  const styles = useStyles()
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <VoucherCenter mode="pick" />
      </ScrollView>
    </View>
  )
}

const useStyles = makeStyles(({ COLORS }) => ({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingTop: 12, paddingBottom: 36 },
}))
