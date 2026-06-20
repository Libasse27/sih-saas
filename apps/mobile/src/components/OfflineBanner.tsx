import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

/**
 * Mode hors-ligne (Phase 14) — bannière persistante (pas un Snackbar auto-masqué) : tant que la
 * connexion n'est pas revenue, l'utilisateur doit savoir que ses actions (envoi de message, prise
 * de RDV) restent en attente (voir onlineManager dans app/_layout.tsx, qui met React Query en pause).
 */
export function OfflineBanner() {
  const [horsLigne, setHorsLigne] = useState(false);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setHorsLigne(state.isConnected === false);
    });
  }, []);

  if (!horsLigne) {
    return null;
  }

  return (
    <Text style={styles.banniere}>Vous êtes hors-ligne — vos actions seront envoyées dès le retour de la connexion.</Text>
  );
}

const styles = StyleSheet.create({
  banniere: {
    backgroundColor: '#B3261E',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 13,
  },
});
