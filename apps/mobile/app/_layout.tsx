import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, PaperProvider, Text } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { authentifierParBiometrie } from '../src/auth/biometric';
import { ToastHost } from '../src/components/ToastHost';

const queryClient = new QueryClient();

function Navigation() {
  const { pret, estConnecte, biometrieActivee } = useAuth();
  const [verrouille, setVerrouille] = useState(false);
  const [verifEnCours, setVerifEnCours] = useState(true);

  async function verifierBiometrie() {
    setVerifEnCours(true);
    const active = await biometrieActivee();
    if (!active) {
      setVerrouille(false);
      setVerifEnCours(false);
      return;
    }
    const ok = await authentifierParBiometrie();
    setVerrouille(!ok);
    setVerifEnCours(false);
  }

  useEffect(() => {
    if (pret && estConnecte) {
      verifierBiometrie();
    } else {
      setVerifEnCours(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pret, estConnecte]);

  if (!pret || verifEnCours) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator />
      </View>
    );
  }

  if (estConnecte && verrouille) {
    return (
      <View style={styles.centre}>
        <Text style={styles.message}>Déverrouillage biométrique requis pour continuer.</Text>
        <Button mode="contained" onPress={verifierBiometrie}>
          Réessayer
        </Button>
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Protected guard={estConnecte}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!estConnecte}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Navigation />
            <ToastHost />
            <StatusBar style="auto" />
          </AuthProvider>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  message: { textAlign: 'center' },
});
