import { Stack } from 'expo-router';

export default function RendezVousLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Mes rendez-vous' }} />
      <Stack.Screen name="nouveau" options={{ title: 'Nouveau rendez-vous' }} />
    </Stack>
  );
}
