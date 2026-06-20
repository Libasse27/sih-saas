import { TypeConsentement } from '@sih-saas/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, List, Text } from 'react-native-paper';
import * as patientsService from '../../src/api/patients.service';
import type { ConsentementEntry } from '../../src/api/patients.service';
import { useAuth } from '../../src/auth/AuthContext';

const LIBELLE_TYPE: Record<TypeConsentement, string> = {
  [TypeConsentement.TRAITEMENT_DONNEES_SANTE]: 'Traitement de mes données de santé',
  [TypeConsentement.PARTAGE_ASSURANCE]: 'Partage avec mon assurance (tiers-payant)',
  [TypeConsentement.COMMUNICATION_ELECTRONIQUE]: 'Communications électroniques (SMS/email)',
};

export default function ProfilScreen() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const patientQuery = useQuery({ queryKey: ['patient', 'moi'], queryFn: patientsService.findMine });

  const consentementMutation = useMutation({
    mutationFn: ({ type, valeur }: { type: TypeConsentement; valeur: boolean }) =>
      patientsService.enregistrerConsentement(type, valeur),
    onSuccess: (patient) => {
      queryClient.setQueryData(['patient', 'moi'], patient);
    },
  });

  if (patientQuery.isLoading || !patientQuery.data) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator />
      </View>
    );
  }

  const patient = patientQuery.data;

  // État actuel par type = la dernière entrée de ce type (historique append-only côté backend).
  const statutActuel: Partial<Record<TypeConsentement, ConsentementEntry>> = {};
  for (const entree of patient.consentements) {
    statutActuel[entree.type] = entree;
  }
  const historique = [...patient.consentements].reverse();

  return (
    <ScrollView contentContainerStyle={styles.conteneur}>
      <Text variant="headlineSmall">Mon profil</Text>

      <Card style={styles.carte}>
        <Card.Title title={`${patient.prenom} ${patient.nom}`} subtitle={`IDH : ${patient.idh}`} />
        <Card.Content>
          <Text>Téléphone : {patient.telephone ?? '—'}</Text>
          <Text>Adresse : {patient.adresse ?? '—'}</Text>
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={styles.sousTitre}>
        Confidentialité
      </Text>
      <Text style={styles.explication}>
        La loi sénégalaise (n°2008-12) protège vos données de santé. Vous pouvez accepter ou refuser
        chacun des traitements ci-dessous, et changer d’avis à tout moment.
      </Text>

      {Object.values(TypeConsentement).map((type) => {
        const entree = statutActuel[type];
        const enCoursPourCeType = consentementMutation.isPending && consentementMutation.variables?.type === type;
        return (
          <Card key={type} style={styles.carteConsentement}>
            <Card.Content>
              <Text variant="bodyLarge">{LIBELLE_TYPE[type]}</Text>
              <Text style={styles.statut}>
                {entree
                  ? `${entree.valeur ? 'Accepté' : 'Refusé'} le ${new Date(entree.date).toLocaleString('fr-SN')}`
                  : 'Jamais demandé'}
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button
                mode={entree?.valeur === true ? 'contained' : 'outlined'}
                disabled={entree?.valeur === true}
                loading={enCoursPourCeType && consentementMutation.variables?.valeur === true}
                onPress={() => consentementMutation.mutate({ type, valeur: true })}
              >
                Accepter
              </Button>
              <Button
                mode={entree?.valeur === false ? 'contained' : 'outlined'}
                disabled={entree?.valeur === false}
                loading={enCoursPourCeType && consentementMutation.variables?.valeur === false}
                onPress={() => consentementMutation.mutate({ type, valeur: false })}
              >
                Refuser
              </Button>
            </Card.Actions>
          </Card>
        );
      })}

      {historique.length > 0 && (
        <>
          <Divider style={styles.separateur} />
          <Text variant="titleMedium">Historique</Text>
          {historique.map((entree, index) => (
            <List.Item
              key={index}
              title={LIBELLE_TYPE[entree.type]}
              description={`${entree.valeur ? 'Accepté' : 'Refusé'} le ${new Date(entree.date).toLocaleString('fr-SN')}`}
            />
          ))}
        </>
      )}

      <Button mode="outlined" onPress={logout} style={styles.deconnexion}>
        Se déconnecter
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  conteneur: { padding: 16, gap: 8 },
  carte: { marginTop: 8 },
  sousTitre: { marginTop: 16 },
  explication: { marginTop: 4, marginBottom: 8 },
  carteConsentement: { marginTop: 8 },
  statut: { marginTop: 4, opacity: 0.7 },
  separateur: { marginVertical: 16 },
  deconnexion: { marginTop: 24, marginBottom: 16 },
});
