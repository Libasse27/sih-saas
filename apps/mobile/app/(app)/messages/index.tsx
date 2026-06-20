import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, FAB, Text } from 'react-native-paper';
import * as messagingService from '../../../src/api/messaging.service';

export default function MessagesListeScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: messagingService.findConversations,
  });

  return (
    <View style={styles.conteneur}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        onRefresh={refetch}
        refreshing={isRefetching}
        contentContainerStyle={styles.liste}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={styles.chargement} />
          ) : (
            <Text style={styles.vide}>Aucune conversation pour le moment.</Text>
          )
        }
        renderItem={({ item }) => (
          <Card style={styles.carte} onPress={() => router.push(`/messages/${item.id}`)}>
            <Card.Content>
              <Text variant="titleMedium">{item.praticienNom}</Text>
              {item.dernierMessageAt ? (
                <Text variant="bodySmall">{new Date(item.dernierMessageAt).toLocaleString('fr-SN')}</Text>
              ) : (
                <Text variant="bodySmall">Aucun message encore.</Text>
              )}
            </Card.Content>
          </Card>
        )}
      />
      <FAB icon="plus" style={styles.fab} label="Nouveau" onPress={() => router.push('/messages/nouveau')} />
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { flex: 1 },
  liste: { padding: 16, gap: 12 },
  carte: { marginBottom: 4 },
  chargement: { marginTop: 48 },
  vide: { textAlign: 'center', marginTop: 48 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
