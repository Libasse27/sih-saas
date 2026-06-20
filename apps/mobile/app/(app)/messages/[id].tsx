import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Scope } from '@sih-saas/shared';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, Surface, Text, TextInput } from 'react-native-paper';
import * as messagingService from '../../../src/api/messaging.service';

/** Pas de socket.io côté mobile (Phase 14) — la fraîcheur est assurée par ce polling + les notifications push. */
const INTERVALLE_RAFRAICHISSEMENT_MS = 5000;

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [contenu, setContenu] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => messagingService.findMessages(id, 1, 50),
    refetchInterval: INTERVALLE_RAFRAICHISSEMENT_MS,
  });

  const envoyerMutation = useMutation({
    mutationFn: (texte: string) => messagingService.envoyerMessage(id, texte),
    onSuccess: () => {
      setContenu('');
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  function envoyer() {
    const texte = contenu.trim();
    if (!texte) return;
    envoyerMutation.mutate(texte);
  }

  return (
    <KeyboardAvoidingView style={styles.conteneur} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        // Le backend renvoie déjà les messages du plus récent au plus ancien (ORDER BY created_at
        // DESC) — exactement ce que `inverted` attend en position 0 (bas visuel de la liste de chat).
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.liste}
        ListEmptyComponent={isLoading ? <ActivityIndicator style={styles.chargement} /> : <Text style={styles.vide}>Aucun message.</Text>}
        renderItem={({ item }) => {
          const estMoi = item.auteurScope === Scope.PATIENT;
          return (
            <Surface style={[styles.bulle, estMoi ? styles.bulleMoi : styles.bulleAutre]} elevation={1}>
              <Text style={estMoi ? styles.texteMoi : styles.texteAutre}>{item.contenu}</Text>
              <Text variant="bodySmall" style={estMoi ? styles.texteMoi : styles.texteAutre}>
                {new Date(item.createdAt).toLocaleTimeString('fr-SN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Surface>
          );
        }}
      />

      <View style={styles.zoneSaisie}>
        <TextInput
          style={styles.champ}
          mode="outlined"
          placeholder="Écrire un message..."
          value={contenu}
          onChangeText={setContenu}
          multiline
        />
        <IconButton icon="send" mode="contained" onPress={envoyer} loading={envoyerMutation.isPending} disabled={!contenu.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  conteneur: { flex: 1 },
  liste: { padding: 16, gap: 8, flexGrow: 1 },
  chargement: { marginTop: 48 },
  vide: { textAlign: 'center', marginTop: 48, transform: [{ scaleY: -1 }] },
  bulle: { padding: 10, borderRadius: 12, maxWidth: '80%', marginBottom: 8 },
  bulleMoi: { backgroundColor: '#1565C0', alignSelf: 'flex-end' },
  bulleAutre: { backgroundColor: '#E0E0E0', alignSelf: 'flex-start' },
  texteMoi: { color: '#FFFFFF' },
  texteAutre: { color: '#000000' },
  zoneSaisie: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 4 },
  champ: { flex: 1, maxHeight: 100 },
});
