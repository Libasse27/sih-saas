import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Card, Text } from 'react-native-paper';
import * as facturesService from '../../src/api/factures.service';
import * as rendezVousService from '../../src/api/rendez-vous.service';

export default function AccueilScreen() {
  const rdvQuery = useQuery({ queryKey: ['rendez-vous', 'accueil'], queryFn: () => rendezVousService.findMine(1, 1) });
  const facturesQuery = useQuery({ queryKey: ['factures', 'accueil'], queryFn: () => facturesService.findMine(1, 1) });

  const prochainRdv = rdvQuery.data?.items[0];
  const derniereFacture = facturesQuery.data?.items[0];

  return (
    <ScrollView contentContainerStyle={styles.conteneur}>
      <Text variant="headlineSmall">Bienvenue</Text>

      <Card style={styles.carte} onPress={() => router.push('/rendez-vous')}>
        <Card.Title title="Prochain rendez-vous" />
        <Card.Content>
          {rdvQuery.isLoading ? (
            <ActivityIndicator />
          ) : prochainRdv ? (
            <Text>{new Date(prochainRdv.dateHeure).toLocaleString('fr-SN')}</Text>
          ) : (
            <Text>Aucun rendez-vous planifié.</Text>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.carte} onPress={() => router.push('/factures')}>
        <Card.Title title="Dernière facture" />
        <Card.Content>
          {facturesQuery.isLoading ? (
            <ActivityIndicator />
          ) : derniereFacture ? (
            <Text>
              {derniereFacture.numero} — {derniereFacture.partPatient} XOF — {derniereFacture.statut}
            </Text>
          ) : (
            <Text>Aucune facture pour le moment.</Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteneur: { padding: 16, gap: 16 },
  carte: { marginTop: 8 },
});
