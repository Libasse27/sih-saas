import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function AppLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="dossier"
        options={{
          title: 'Dossier',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="folder-account" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="rendez-vous"
        options={{
          title: 'Rendez-vous',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="calendar-clock" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="factures"
        options={{
          title: 'Factures',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="receipt" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="message-text" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
