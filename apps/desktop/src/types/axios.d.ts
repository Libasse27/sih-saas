import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Si vrai, l'intercepteur de réponse n'affiche pas de toast d'erreur (cas attendus, ex. 404 "pas encore d'abonnement"). */
    silenceErreur?: boolean;
  }
}
