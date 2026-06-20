import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Button, HelperText, RadioButton, Text } from 'react-native-paper';
import * as messagingService from '../../../src/api/messaging.service';
import * as praticiensService from '../../../src/api/praticiens.service';

export default function NouvelleConversationScreen() {
  const praticiensQuery = useQuery({ queryKey: ['praticiens'], queryFn: praticiensService.findPraticiens });
  const [praticienId, setPraticienId] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function demarrer() {
    setErreur(null);
    if (!praticienId) {
      setErreur('Choisissez un praticien.');
      return;
    }

    setEnCours(true);
    try {
      const conversation = await messagingService.demarrerConversation(praticienId);
      router.replace(`/messages/${conversation.id}`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Impossible de démarrer la conversation.');
    } finally {
      setEnCours(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.conteneur}>
      <Text variant="titleMedium">Choisissez un praticien</Text>
      {praticiensQuery.isLoading ? (
        <ActivityIndicator />
      ) : !praticiensQuery.data?.length ? (
        <Text>Aucun praticien disponible dans votre établissement pour le moment.</Text>
      ) : (
        <RadioButton.Group onValueChange={setPraticienId} value={praticienId ?? ''}>
          {praticiensQuery.data.map((praticien) => (
            <RadioButton.Item
              key={praticien.id}
              label={`${praticien.prenom} ${praticien.nom} — ${praticien.roles.join(', ')}`}
              value={praticien.id}
            />
          ))}
        </RadioButton.Group>
      )}

      {erreur && <HelperText type="error">{erreur}</HelperText>}

      <Button mode="contained" onPress={demarrer} loading={enCours} disabled={enCours} style={styles.bouton}>
        Démarrer la conversation
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteneur: { padding: 16, gap: 8 },
  bouton: { marginTop: 16 },
});
