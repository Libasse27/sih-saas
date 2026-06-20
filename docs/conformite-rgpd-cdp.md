# Conformité RGPD / Loi sénégalaise sur la protection des données personnelles

**Phase 19 (terme utilisateur, absent du prompt maître) — 2026-06-20.**

## ⚠️ Avertissement — à lire avant toute autre chose

**Ce document n'est pas un avis juridique.** Il a été produit par un agent IA (Claude, Anthropic) à partir d'une recherche documentaire publique sur le cadre légal sénégalais et le RGPD, croisée avec un audit technique du code source de cette plateforme. Il répond à la demande explicite du prompt maître (§17) : *« conformité RGPD + cadre sénégalais (CDP / loi sur la protection des données) — à faire confirmer juridiquement »*.

**Ce document est un point de départ pour cette confirmation juridique, pas un substitut.** Avant toute mise en production avec des données patients réelles, ce document doit être revu par un avocat ou juriste sénégalais spécialisé en protection des données, qui seul peut :
- confirmer l'interprétation des textes ci-dessous (notamment le régime exact d'autorisation CDP applicable à un SaaS multi-établissements) ;
- engager les démarches déclaratives/d'autorisation auprès de la CDP ;
- valider les contrats (sous-traitance, conditions d'utilisation, politique de confidentialité) ;
- évaluer l'exposition au RGPD si des patients ou établissements relèvent de son champ d'application.

---

## 1. Cadre légal applicable

### 1.1 Loi sénégalaise n°2008-12 du 25 janvier 2008 (cadre effectivement applicable)

Loi sur la protection des données à caractère personnel, complétée par le décret d'application n°2008-721 du 30 juin 2008. Autorité de contrôle : la **Commission de Protection des Données Personnelles (CDP)**, opérationnelle depuis 2013, autorité administrative indépendante avec pouvoir de contrôle, d'autorisation et de sanction.

Points structurants identifiés (sources en fin de document) :
- **Champ d'application extraterritorial** : s'applique à tout traitement de données de personnes situées au Sénégal, quel que soit le lieu d'établissement du responsable du traitement — pertinent même si l'hébergement de cette plateforme se fait hors du pays.
- **Données sensibles** : la loi liste explicitement les données de **santé** parmi les données sensibles (avec opinions religieuses/politiques/syndicales, vie sexuelle/raciale, mesures sociales, condamnations).
- **Régime à deux vitesses** :
  - Données à caractère personnel "ordinaires" → **déclaration préalable** à la CDP avec récépissé, avant mise en œuvre.
  - Données **sensibles** (donc **toutes les données de santé traitées par cette plateforme**) → **autorisation préalable expresse de la CDP**, délai d'instruction de 2 mois, le silence valant accord tacite à l'expiration.
- **Droits des personnes concernées** : accès, rectification, effacement, opposition.
- **Obligations du responsable de traitement** : finalité déterminée/légitime, consentement préalable pour les données de santé, mesures de sécurité techniques et organisationnelles appropriées (chiffrement, pare-feu, politiques internes), tenue d'un registre des traitements, notification des violations de données à l'autorité et aux personnes concernées.
- **Sanctions (article 39)** : retrait provisoire (3 mois) puis définitif de l'autorisation, amendes de **1 000 000 à 100 000 000 FCFA**, suspension du traitement (3 mois max), verrouillage des données, interdiction temporaire ou définitive de traitement, sanctions pénales (Code pénal + loi sur la cybercriminalité).
- **Réforme en attente** : un projet de loi de 2019 vise à moderniser le texte pour couvrir explicitement la biométrie, le big data, l'IA et l'informatique en nuage (cloud) — **non encore adopté à la date de ce document**, mais signale une direction réglementaire à anticiper (cette plateforme utilise déjà la biométrie mobile et un hébergement cloud).

### 1.2 RGPD (Union européenne)

Retenu par le prompt maître comme référentiel de bonnes pratiques, indépendamment de l'applicabilité territoriale stricte (qui dépendrait de la localisation réelle des patients/établissements clients et de l'hébergement). Points structurants pertinents pour un SIH :
- **Article 9** : les données de santé sont une "catégorie particulière" — traitement interdit par défaut sauf condition explicite (consentement explicite, ou nécessité pour la prise en charge médicale/la santé publique sous encadrement légal).
- **Article 6 + Article 9 cumulatifs** : une base légale générale (Art. 6) ET une exception Art. 9 sont toutes les deux requises.
- **Article 32** : sécurité du traitement — chiffrement, pseudonymisation, moyens de garantir confidentialité/intégrité/disponibilité/résilience.
- **Article 35** : analyse d'impact relative à la protection des données (AIPD/DPIA) **probablement obligatoire** pour un traitement à grande échelle de données de santé — jamais réalisée pour cette plateforme à ce jour.
- **Articles 33/34** : notification de violation à l'autorité de contrôle (72h) et aux personnes concernées si risque élevé.
- **Articles 15-20** : droits d'accès, rectification, effacement, limitation, portabilité.

---

## 2. Question structurante propre à un SaaS multi-établissements : qui est responsable du traitement ?

Le RGPD et la loi sénégalaise distinguent (de façon quasi identique) le **responsable du traitement** (qui décide des finalités et moyens) et le **sous-traitant** (qui traite pour le compte du responsable). Dans l'architecture de cette plateforme :

- **Chaque établissement client** (hôpital/clinique) est très probablement le **responsable du traitement** des données de ses propres patients — c'est lui qui soigne, qui décide de l'usage du dossier médical, qui a la relation directe avec le patient.
- **L'opérateur de la plateforme SIH SaaS** (le « super-admin ») agit très probablement comme **sous-traitant** — il héberge, exploite techniquement, mais n'utilise pas les données pour ses propres finalités.

**Conséquences concrètes, jamais traitées dans ce projet à ce jour :**
1. C'est en principe **chaque établissement** qui doit obtenir (ou démontrer qu'il a obtenu) l'**autorisation préalable de la CDP** pour le traitement des données de santé de ses patients — pas l'opérateur de la plateforme à leur place. Le provisionnement automatique d'un nouvel établissement (prompt maître §11) ne vérifie ni ne rappelle aujourd'hui cette obligation.
2. Un **contrat de sous-traitance** (Data Processing Agreement) entre l'opérateur de la plateforme et chaque établissement client devrait formaliser : les garanties techniques apportées (chiffrement, RLS, audit), les sous-traitants ultérieurs (hébergeur cloud), la durée de conservation, les modalités de restitution/suppression des données en fin de contrat, l'assistance en cas de demande d'exercice de droits ou de violation. **Aucun modèle de ce contrat n'existe aujourd'hui.**
3. Le `Setting` super-admin (Phase 16) ou le provisionnement (Phase 4/11) pourrait à terme exposer un champ "statut d'autorisation CDP" par établissement, à valider avant l'activation réelle (actuellement aucune vérification de ce type n'existe — l'activation ne dépend que du paiement réussi).

---

## 3. Audit du système actuel face aux exigences

Légende : ✅ déjà couvert et vérifié dans le code · 🟡 partiellement couvert · ❌ non couvert.

| Exigence | Statut | Élément technique constaté | Recommandation |
|---|---|---|---|
| Sécurité — chiffrement en transit | ✅ | TLS prévu en prod (reverse proxy), JWT signés | Confirmer la configuration TLS réelle au moment du déploiement choisi |
| Sécurité — isolation multi-tenant | ✅ | RLS PostgreSQL réelle (`clinic.*`, policy `tenant_isolation`) + plugin Mongoose tenant, testée à chaque phase | Aucune action — point fort du projet |
| Sécurité — contrôle d'accès clinique | ✅ | `CareContextGuard` (lien de soin réel, pas juste l'établissement) + journalisation systématique | Aucune action |
| Sécurité — authentification | ✅ | bcrypt 12 rounds, JWT access+refresh avec rotation, MFA TOTP personnel, biométrie patient mobile, anti-bruteforce + verrouillage | Aucune action |
| Sécurité — limitation de débit / clés API | ✅ | `ThrottlerModule` global + dédié login/MFA, clés API scopées par établissement et par permission | Aucune action |
| Sécurité — stockage local chiffré | ✅ | `expo-secure-store` (mobile), `safeStorage` Electron (desktop) | Aucune action |
| Traçabilité — journal d'audit | ✅ | `AuditLog` append-only avec `etablissementId`, `userId`, IP, horodatage, sur la quasi-totalité des actions sensibles | Envisager une politique de rétention/partitionnement explicite (déjà recommandée prompt maître §18) |
| Sécurité — chiffrement au repos | ❌ | Aucune configuration explicite trouvée dans `docker-compose.prod.yml`/scripts d'init Postgres/Mongo | Documenter le choix selon l'hébergement final retenu (beaucoup d'offres cloud le proposent nativement) ; envisager `pgcrypto`/volumes chiffrés sinon |
| Consentement patient (santé = donnée sensible, consentement requis) | ❌ | Champ `PatientEntity.consentements` (jsonb) existe depuis la Phase 5 mais **n'est jamais lu ni écrit par aucun service/contrôleur** — pur vestige de modélisation | Construire un vrai flux de capture du consentement (à l'admission et/ou à la création du compte d'accès mobile), horodaté, versionné, et réellement exploité avant tout traitement |
| Droit d'accès | 🟡 | Le patient peut consulter son dossier via l'app mobile (Phase 10) | Pas d'export structuré — voir portabilité ci-dessous |
| Droit de rectification | 🟡 | `PATCH /patients/:id` existe mais réservé au personnel établissement | Le patient lui-même ne peut pas demander une rectification depuis l'app mobile — à minima prévoir un canal (ex. via la messagerie sécurisée déjà existante, Phase 14) |
| Droit à l'effacement | ❌ | Aucun endpoint de suppression patient, ni soft-delete réellement déclenché (la colonne `deletedAt` existe par convention TypeORM mais aucun service ne l'utilise) | Concevoir le flux : un dossier médical ne peut probablement pas être effacé sans nuancer avec les obligations de conservation propres au secteur de la santé (souvent contradictoires avec le droit à l'effacement) — nécessite un arbitrage juridique avant tout développement |
| Droit à la portabilité | ❌ | Aucun export de données implémenté (dossier médical, factures, etc.) | Construire un export structuré (JSON/PDF) du dossier patient à la demande |
| Limitation de la durée de conservation | ❌ | Aucune politique de purge automatique ; aucune durée de conservation définie dans le code ou la documentation | Définir une politique par type de donnée (dossier médical, facturation, audit) — probablement contrainte par des obligations légales de conservation des données de santé à clarifier avec un juriste |
| Notification de violation de données | ❌ | Aucun processus (technique ou organisationnel) documenté | Définir un plan de réponse à incident : détection, qualification de la gravité, délai de notification CDP, modèle de notification aux personnes concernées |
| Registre des traitements | ❌ | Inexistant comme document formel | Ce document (§3 notamment) peut servir de point de départ, à formaliser |
| Analyse d'impact (DPIA/AIPD) | ❌ | Jamais réalisée | Probablement requise compte tenu du volume et de la sensibilité des données — à réaliser avec un juriste avant la première mise en production réelle |
| Autorisation CDP préalable (donnée sensible) | ❌ / inconnu | Aucune trace dans le projet d'une démarche engagée, par l'opérateur ou par un établissement pilote | **Action bloquante avant toute donnée patient réelle** — voir §2 |
| Contrat de sous-traitance type (opérateur ↔ établissement) | ❌ | Inexistant | À rédiger avec un juriste, en s'appuyant sur les garanties techniques déjà réelles (RLS, audit, chiffrement transit) |
| Localisation des données / transferts transfrontaliers | ❌ / à clarifier | Environnement actuel = développement local (Docker), aucun hébergement de production choisi | Trancher l'hébergement (Sénégal vs ailleurs) avant la mise en production — conditionne l'analyse des transferts transfrontaliers sous les deux régimes |

---

## 4. Risques prioritaires (synthèse)

1. **Bloquant légal** : statut d'autorisation CDP non engagé/inconnu pour le traitement de données de santé — à clarifier avant toute donnée patient réelle, établissement par établissement.
2. **Consentement patient non réellement capturé** malgré un champ prévu depuis la Phase 5 — écart entre l'intention de conception et l'implémentation réelle.
3. **Droits d'effacement et de portabilité absents** — non-conformité directe aux deux régimes si exercés par une personne concernée.
4. **Aucun contrat de sous-traitance** entre l'opérateur de la plateforme et ses établissements clients.
5. **Aucune procédure de notification de violation** — un incident réel ne pourrait pas être traité dans les délais légaux faute de processus défini.
6. **Chiffrement au repos non confirmé** — dépend de l'hébergement final, à verrouiller avant la production.

## 5. Ce qui est déjà solide (à ne pas refaire)

L'audit (§3) montre que les fondations **sécurité** du projet sont substantielles et dépassent souvent ce qu'exige strictement la loi : isolation multi-tenant structurelle (RLS), contrôle d'accès clinique avec lien de soin réel (pas seulement l'appartenance à l'établissement), journalisation quasi systématique, MFA, biométrie, anti-bruteforce. L'essentiel du travail réellement manquant relève de la **gouvernance des données** (consentement, droits des personnes, contrats, autorisations) plutôt que de la sécurité technique — cohérent avec un projet construit code-first sans accompagnement juridique jusqu'ici.

## 6. Sources consultées (2026-06-20)

- [Commission de protection des données personnelles (Sénégal) — Wikipédia](https://fr.wikipedia.org/wiki/Commission_de_protection_des_donn%C3%A9es_personnelles_(S%C3%A9n%C3%A9gal))
- [Understanding Personal Data Protection in Senegal — African Legal Factory](https://africanlegalfactory.com/2024/01/30/understanding-personal-data-protection-in-senegal/?lang=en)
- [NATLEX — Loi n° 2008-12 du 25 janvier 2008](https://www.ilo.org/dyn/natlex/natlex4.detail?p_lang=fr&p_isn=85279)
- [Le Sénégal va réviser la loi sur la protection des données personnelles — CIPESA](https://cipesa.org/2020/01/le-senegal-va-reviser-la-loi-sur-la-protection-des-donnees-personnelles/)
- [Healthcare GDPR Compliance & Article 9 — Secure Privacy](https://support.secureprivacy.ai/article/industry-specific-dpo-guidance-healthcare/)
- [GDPR Article 9: Special Personal Data Categories — Exabeam](https://www.exabeam.com/explainers/gdpr-compliance/gdpr-article-9-special-personal-data-categories-and-how-to-protect-them/)

**Rappel final : ces sources sont des analyses publiques secondaires, pas le texte de loi consulté directement (le PDF officiel référencé par plusieurs sources n'était plus accessible au moment de la rédaction). Toute décision opérationnelle doit s'appuyer sur le texte légal à jour et l'avis d'un juriste.**
