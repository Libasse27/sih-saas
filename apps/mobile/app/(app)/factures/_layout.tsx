import { Stack } from 'expo-router';

export default function FacturesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Mes factures' }} />
      <Stack.Screen name="[id]" options={{ title: 'Facture' }} />
    </Stack>
  );
}
