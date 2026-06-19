import { useQuery } from '@tanstack/react-query';
import { FacturePatientStatut } from '@sih-saas/shared';
import { router } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';
import { ActivityIndicator, Card, Chip, Text } from 'react-native-paper';
import * as facturesService from '../../../src/api/factures.service';

const COULEUR_STATUT: Record<FacturePatientStatut, string> = {
  [FacturePatientStatut.EN_ATTENTE]: '#EF6C00',
  [FacturePatientStatut.PARTIELLEMENT_PAYEE]: '#F9A825',
  [FacturePatientStatut.PAYEE]: '#2E7D32',
  [FacturePatientStatut.ANNULEE]: '#616161',
};

export default function FacturesListeScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['factures'],
    queryFn: () => facturesService.findMine(1, 50),
  });

  return (
    <FlatList
      data={data?.items ?? []}
      keyExtractor={(item) => item.id}
      onRefresh={refetch}
      refreshing={isRefetching}
      contentContainerStyle={styles.liste}
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator style={styles.chargement} />
        ) : (
          <Text style={styles.vide}>Aucune facture pour le moment.</Text>
        )
      }
      renderItem={({ item }) => (
        <Card style={styles.carte} onPress={() => router.push(`/factures/${item.id}`)}>
          <Card.Content>
            <Text variant="titleMedium">{item.numero}</Text>
            <Text>{item.partPatient} XOF à votre charge</Text>
            <Chip style={[styles.chip, { backgroundColor: COULEUR_STATUT[item.statut] }]} textStyle={styles.chipTexte}>
              {item.statut}
            </Chip>
          </Card.Content>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  liste: { padding: 16, gap: 12 },
  carte: { marginBottom: 4 },
  chip: { marginTop: 8, alignSelf: 'flex-start' },
  chipTexte: { color: '#FFFFFF' },
  chargement: { marginTop: 48 },
  vide: { textAlign: 'center', marginTop: 48 },
});
