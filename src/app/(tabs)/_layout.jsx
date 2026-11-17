import { Text } from 'react-native'
import { Tabs } from 'expo-router'
import { House, ReceiptText, TicketPercent, UserRound } from 'lucide-react-native'
import { FONTS } from '../../theme/tokens.js'
import { useTheme } from '../../theme/useTheme.js'

const TABS = [
  { name: 'index', title: 'Beranda', icon: House },
  { name: 'voucher', title: 'Voucher', icon: TicketPercent },
  { name: 'orders', title: 'Pesanan', icon: ReceiptText },
  { name: 'profile', title: 'Akun', icon: UserRound },
]

export default function TabLayout() {
  const { COLORS } = useTheme()
  const inactive = COLORS.textMuted

  return (
    <Tabs screenOptions={{
      headerShown: false,
      sceneStyle: { backgroundColor: COLORS.card },
      tabBarStyle: {
        backgroundColor: COLORS.card,
        borderTopColor: COLORS.borderSubtle,
        borderTopWidth: 1,
        paddingTop: 8,
        minHeight: 68,
        elevation: 0,
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: inactive,
    }}>
      {TABS.map(({ name, title, icon: Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused, color }) => <Icon size={26} color={color} strokeWidth={focused ? 2.3 : 1.7} />,
            tabBarLabel: ({ focused, color }) => (
              <Text style={{ color, fontFamily: FONTS.sans, fontSize: focused ? 13.5 : 12.5, fontWeight: focused ? '800' : '500', marginTop: 2 }}>{title}</Text>
            ),
          }}
        />
      ))}
    </Tabs>
  )
}
