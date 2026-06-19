import * as LocalAuthentication from 'expo-local-authentication';

export async function biometrieDisponible(): Promise<boolean> {
  const [materielOk, enrole] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return materielOk && enrole;
}

export async function authentifierParBiometrie(): Promise<boolean> {
  const resultat = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Déverrouillez votre espace patient',
    cancelLabel: 'Annuler',
  });
  return resultat.success;
}
