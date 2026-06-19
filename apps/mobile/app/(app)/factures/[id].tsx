import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FacturePatientStatut, ModePaiementPatient } from '@sih-saas/shared';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, HelperText, RadioButton, Text } from 'react-native-paper';
import * as facturesService from '../../../src/api/factures.service';

const MODES_EN_LIGNE = [ModePaiementPatient.ORANGE_MONEY, ModePaiementPatient.WAVE, ModePaiementPatient.CARTE];

export default function FactureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['factures'],
    queryFn: () => facturesService.findMine(1, 100),
  });
  const facture = data?.items.find((item) => item.id === id);

  const [mode, setMode] = useState<ModePaiementPatient>(ModePaiementPatient.ORANGE_MONEY);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function payer() {
    if (!facture) return;
    setErreur(null);
    setEnCours(true);
    try {
      const resultat = await facturesService.payer(facture.id, facture.partPatient, mode);
      if (resultat.redirectUrl) {
        await WebBrowser.openBrowserAsync(resultat.redirectUrl);
      }
      await queryClient.invalidateQueries({ queryKey: ['factures'] });
      await refetch();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Paiement impossible pour le moment.');
    } finally {
      setEnCours(false);
    }
  }

  if (isLoading || !facture) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator />
      </View>
    );
  }

  const soldeAcquitte = facture.statut === FacturePatientStatut.PAYEE || facture.statut === FacturePatientStatut.ANNULEE;

  return (
    <ScrollView contentContainerStyle={styles.conteneur}>
      <Text variant="titleLarge">{facture.numero}</Text>
      <Text>{new Date(facture.dateEmission).toLocaleDateString('fr-SN')}</Text>

      <Card style={styles.carte}>
        <Card.Content>
          {facture.lignes.map((ligne, index) => (
            <View key={index} style={styles.ligne}>
              <Text>
                {ligne.libelle} × {ligne.quantite}
              </Text>
              <Text>{ligne.quantite * ligne.prixUnitaire} XOF</Text>
            </View>
          ))}
          <Divider style={styles.separateur} />
          <View style={styles.ligne}>
            <Text>Montant total</Text>
            <Text>{facture.montantTotal} XOF</Text>
          </View>
          <View style={styles.ligne}>
            <Text>Part assurance</Text>
            <Text>{facture.partAssurance} XOF</Text>
          </View>
          <View style={styles.ligne}>
            <Text variant="titleMedium">Reste à votre charge</Text>
            <Text variant="titleMedium">{facture.partPatient} XOF</Text>
          </View>
        </Card.Content>
      </Card>

      {soldeAcquitte ? (
        <Text style={styles.statutFinal}>Statut : {facture.statut}</Text>
      ) : (
        <>
          <Text variant="titleMedium" style={styles.sousTitre}>
            Régler cette facture
          </Text>
          <RadioButton.Group onValueChange={(valeur) => setMode(valeur as ModePaiementPatient)} value={mode}>
            {MODES_EN_LIGNE.map((modePaiement) => (
              <RadioButton.Item key={modePaiement} label={modePaiement} value={modePaiement} />
            ))}
          </RadioButton.Group>

          {erreur && <HelperText type="error">{erreur}</HelperText>}

          <Button mode="contained" onPress={payer} loading={enCours} disabled={enCours} style={styles.bouton}>
            Payer {facture.partPatient} XOF
          </Button>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  conteneur: { padding: 16, gap: 4 },
  carte: { marginTop: 16 },
  ligne: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  separateur: { marginVertical: 8 },
  sousTitre: { marginTop: 24 },
  statutFinal: { marginTop: 24, textAlign: 'center' },
  bouton: { marginTop: 16 },
});
