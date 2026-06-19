import { useQuery } from '@tanstack/react-query';
import { RendezVousStatut } from '@sih-saas/shared';
import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, Chip, FAB, Text } from 'react-native-paper';
import * as rendezVousService from '../../../src/api/rendez-vous.service';

const COULEUR_STATUT: Record<RendezVousStatut, string> = {
  [RendezVousStatut.PLANIFIE]: '#1565C0',
  [RendezVousStatut.CONFIRME]: '#2E7D32',
  [RendezVousStatut.TERMINE]: '#616161',
  [RendezVousStatut.ANNULE]: '#B3261E',
  [RendezVousStatut.NO_SHOW]: '#B3261E',
};

export default function RendezVousListeScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['rendez-vous'],
    queryFn: () => rendezVousService.findMine(1, 50),
  });

  return (
    <View style={styles.conteneur}>
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
            <Text style={styles.vide}>Aucun rendez-vous pour le moment.</Text>
          )
        }
        renderItem={({ item }) => (
          <Card style={styles.carte}>
            <Card.Content>
              <Text variant="titleMedium">{new Date(item.dateHeure).toLocaleString('fr-SN')}</Text>
              {item.motif ? <Text>{item.motif}</Text> : null}
              <Chip style={[styles.chip, { backgroundColor: COULEUR_STATUT[item.statut] }]} textStyle={styles.chipTexte}>
                {item.statut}
              </Chip>
            </Card.Content>
          </Card>
        )}
      />
      <FAB icon="plus" style={styles.fab} onPress={() => router.push('/rendez-vous/nouveau')} label="Nouveau" />
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { flex: 1 },
  liste: { padding: 16, gap: 12 },
  carte: { marginBottom: 4 },
  chip: { marginTop: 8, alignSelf: 'flex-start' },
  chipTexte: { color: '#FFFFFF' },
  chargement: { marginTop: 48 },
  vide: { textAlign: 'center', marginTop: 48 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
