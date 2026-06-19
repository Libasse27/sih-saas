import { useQuery } from '@tanstack/react-query';
import { CanalRdv } from '@sih-saas/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Button, HelperText, RadioButton, Text, TextInput } from 'react-native-paper';
import * as praticiensService from '../../../src/api/praticiens.service';
import * as rendezVousService from '../../../src/api/rendez-vous.service';

export default function NouveauRendezVousScreen() {
  const praticiensQuery = useQuery({ queryKey: ['praticiens'], queryFn: praticiensService.findPraticiens });
  const [praticienId, setPraticienId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('');
  const [motif, setMotif] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre() {
    setErreur(null);
    if (!praticienId) {
      setErreur('Choisissez un praticien.');
      return;
    }
    const dateHeure = new Date(`${date}T${heure}:00`);
    if (Number.isNaN(dateHeure.getTime())) {
      setErreur('Date ou heure invalide (format attendu : AAAA-MM-JJ et HH:mm).');
      return;
    }

    setEnCours(true);
    try {
      await rendezVousService.creerMien({
        praticienId,
        dateHeure: dateHeure.toISOString(),
        motif: motif.trim() || undefined,
        canal: CanalRdv.SUR_SITE,
      });
      router.back();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Impossible de créer le rendez-vous.');
    } finally {
      setEnCours(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.conteneur}>
      <Text variant="titleMedium">Praticien</Text>
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

      <TextInput label="Date (AAAA-MM-JJ)" value={date} onChangeText={setDate} placeholder="2026-07-01" style={styles.champ} />
      <TextInput label="Heure (HH:mm)" value={heure} onChangeText={setHeure} placeholder="09:30" style={styles.champ} />
      <TextInput
        label="Motif (optionnel)"
        value={motif}
        onChangeText={setMotif}
        multiline
        style={styles.champ}
      />

      {erreur && <HelperText type="error">{erreur}</HelperText>}

      <Button mode="contained" onPress={soumettre} loading={enCours} disabled={enCours} style={styles.bouton}>
        Demander le rendez-vous
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteneur: { padding: 16, gap: 8 },
  champ: { marginTop: 8 },
  bouton: { marginTop: 16 },
});
