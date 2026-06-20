import NetInfo from '@react-native-community/netinfo';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, PaperProvider, Text } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { authentifierParBiometrie } from '../src/auth/biometric';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { ToastHost } from '../src/components/ToastHost';
import { enregistrerPourNotificationsPush } from '../src/notifications/push-registration';

const queryClient = new QueryClient();

/**
 * Mode hors-ligne (Phase 14) — `onlineManager` est le mécanisme officiel de TanStack Query pour
 * mettre en pause queries/mutations pendant une coupure réseau et les reprendre automatiquement
 * au retour (comportement par défaut de `networkMode: 'online'`, dès qu'on informe le manager de
 * l'état réel du réseau). Volontairement PAS de persistance disque du cache (pas de
 * `PersistQueryClientProvider`/AsyncStorage) : les données seraient en clair sur l'appareil, ce
 * qui contredit "confidentialité des données de santé dès la conception" (prompt maître §17) —
 * seuls les jetons passent par `expo-secure-store` (chiffré), jamais le contenu du dossier/messages.
 * Conséquence assumée : une mutation tentée hors-ligne puis l'app tuée avant reconnexion est perdue
 * (pas de file d'attente persistante) ; en pratique l'app reste ouverte le temps de la reconnexion.
 */
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(state.isConnected === true);
  });
});

/** Tap sur une notification (premier plan, arrière-plan ou app fermée) -> ouvre la conversation concernée. */
function useNavigationDepuisNotification(): void {
  useEffect(() => {
    const abonnement = Notifications.addNotificationResponseReceivedListener((reponse) => {
      const conversationId = reponse.notification.request.content.data?.conversationId as string | undefined;
      if (conversationId) {
        router.push(`/messages/${conversationId}`);
      }
    });
    return () => abonnement.remove();
  }, []);
}

function Navigation() {
  const { pret, estConnecte, biometrieActivee } = useAuth();
  const [verrouille, setVerrouille] = useState(false);
  const [verifEnCours, setVerifEnCours] = useState(true);

  useNavigationDepuisNotification();

  useEffect(() => {
    // Session déjà restaurée (pas de nouveau login) au démarrage de l'app : ré-enregistre tout de
    // même le jeton push, au cas où il aurait changé depuis le dernier lancement.
    if (pret && estConnecte) {
      void enregistrerPourNotificationsPush();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pret, estConnecte]);

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
    <>
      <OfflineBanner />
      <Stack>
        <Stack.Protected guard={estConnecte}>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!estConnecte}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
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
