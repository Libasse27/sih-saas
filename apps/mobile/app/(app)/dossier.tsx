import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Chip, Divider, List, Text } from 'react-native-paper';
import * as dossierService from '../../src/api/dossier.service';

export default function DossierScreen() {
  const { data, isLoading } = useQuery({ queryKey: ['dossier'], queryFn: dossierService.findMonDossier });

  if (isLoading || !data) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator />
      </View>
    );
  }

  const { antecedents, observations, comptesRendus } = data;

  return (
    <ScrollView contentContainerStyle={styles.conteneur}>
      <Text variant="titleMedium">Allergies</Text>
      <View style={styles.ligneChips}>
        {antecedents.allergies.length === 0 ? (
          <Text>Aucune allergie connue.</Text>
        ) : (
          antecedents.allergies.map((allergie, index) => (
            <Chip key={index} style={styles.chipAllergie} textStyle={styles.chipAllergieTexte}>
              {allergie.substance}
              {allergie.severite ? ` (${allergie.severite})` : ''}
            </Chip>
          ))
        )}
      </View>

      <Divider style={styles.separateur} />

      <Text variant="titleMedium">Antécédents médicaux</Text>
      {antecedents.medicaux.length === 0 ? <Text>Aucun antécédent renseigné.</Text> : null}
      {antecedents.medicaux.map((item, index) => (
        <List.Item key={index} title={item} />
      ))}

      <Text variant="titleMedium" style={styles.sousTitre}>
        Antécédents chirurgicaux
      </Text>
      {antecedents.chirurgicaux.length === 0 ? <Text>Aucun antécédent renseigné.</Text> : null}
      {antecedents.chirurgicaux.map((item, index) => (
        <List.Item key={index} title={item} />
      ))}

      <Divider style={styles.separateur} />

      <Text variant="titleMedium">Observations récentes</Text>
      {observations.length === 0 ? <Text>Aucune observation enregistrée.</Text> : null}
      {observations
        .slice()
        .reverse()
        .map((observation, index) => (
          <List.Item
            key={index}
            title={observation.contenu}
            description={`${observation.type} — ${new Date(observation.date).toLocaleDateString('fr-SN')}`}
          />
        ))}

      <Divider style={styles.separateur} />

      <Text variant="titleMedium">Comptes rendus</Text>
      {comptesRendus.length === 0 ? <Text>Aucun compte rendu disponible.</Text> : null}
      {comptesRendus
        .slice()
        .reverse()
        .map((compteRendu, index) => (
          <List.Item
            key={index}
            title={compteRendu.type}
            description={`${new Date(compteRendu.date).toLocaleDateString('fr-SN')}`}
          />
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  conteneur: { padding: 16 },
  ligneChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chipAllergie: { backgroundColor: '#FFDAD6' },
  chipAllergieTexte: { color: '#410E0B' },
  separateur: { marginVertical: 16 },
  sousTitre: { marginTop: 12 },
});
