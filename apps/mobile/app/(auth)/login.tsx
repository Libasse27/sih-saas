import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { biometrieDisponible } from '../../src/auth/biometric';
import { useAuth } from '../../src/auth/AuthContext';

export default function LoginScreen() {
  const { login, activerBiometrie } = useAuth();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [proposerBiometrie, setProposerBiometrie] = useState(false);

  async function soumettre() {
    setErreur(null);
    setEnCours(true);
    try {
      await login(email.trim(), motDePasse);
      const disponible = await biometrieDisponible();
      if (disponible) {
        setProposerBiometrie(true);
      } else {
        router.replace('/');
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Connexion impossible.');
    } finally {
      setEnCours(false);
    }
  }

  async function repondreBiometrie(accepter: boolean): Promise<void> {
    if (accepter) {
      await activerBiometrie();
    }
    setProposerBiometrie(false);
    router.replace('/');
  }

  return (
    <KeyboardAvoidingView style={styles.conteneur} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text variant="headlineMedium" style={styles.titre}>
        Mon espace patient
      </Text>
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.champ}
      />
      <TextInput label="Mot de passe" value={motDePasse} onChangeText={setMotDePasse} secureTextEntry style={styles.champ} />
      {erreur && <Text style={styles.erreur}>{erreur}</Text>}
      <Button mode="contained" onPress={soumettre} loading={enCours} disabled={enCours}>
        Se connecter
      </Button>

      <Portal>
        <Dialog visible={proposerBiometrie} onDismiss={() => repondreBiometrie(false)}>
          <Dialog.Title>Déverrouillage rapide</Dialog.Title>
          <Dialog.Content>
            <Text>Activer le déverrouillage par empreinte/visage pour les prochaines connexions ?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => repondreBiometrie(false)}>Non merci</Button>
            <Button onPress={() => repondreBiometrie(true)}>Activer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  titre: { marginBottom: 24, textAlign: 'center' },
  champ: { marginBottom: 4 },
  erreur: { color: '#B3261E' },
});
