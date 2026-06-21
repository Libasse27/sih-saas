import { CompteRenduImagerieEntity } from '../../../imagerie/infrastructure/entities/compte-rendu-imagerie.entity';
import { DemandeImagerieEntity } from '../../../imagerie/infrastructure/entities/demande-imagerie.entity';
import { DemandeAnalyseEntity } from '../../../laboratoire/infrastructure/entities/demande-analyse.entity';
import { ResultatAnalyseEntity } from '../../../laboratoire/infrastructure/entities/resultat-analyse.entity';

/**
 * Toujours `status: 'final'` : l'appelant (FhirService) ne fournit que des demandes TERMINEE, dont
 * le résultat/compte rendu est nécessairement validé (`dateValidation` posée par le même appel
 * métier qui passe la demande à TERMINEE — voir ResultatsAnalyseService/ComptesRendusImagerieService).
 */
export function mapperResultatsAnalyseEnDiagnosticReport(
  demandes: DemandeAnalyseEntity[],
  resultats: ResultatAnalyseEntity[],
): fhir4.DiagnosticReport[] {
  return demandes.map((demande, index) => {
    const resultat = resultats[index];
    return {
      resourceType: 'DiagnosticReport',
      id: resultat.id,
      status: 'final',
      code: { text: demande.typeAnalyse },
      subject: { reference: `Patient/${demande.patientId}` },
      performer: [{ reference: `Practitioner/${resultat.biologisteId}` }],
      effectiveDateTime: demande.dateDemande.toISOString(),
      issued: resultat.dateValidation!.toISOString(),
      conclusion: resultat.valeursCritiques ? 'Valeurs critiques détectées.' : undefined,
      presentedForm: resultat.fichierUrl ? [{ url: resultat.fichierUrl }] : undefined,
    };
  });
}

export function mapperComptesRendusImagerieEnDiagnosticReport(
  demandes: DemandeImagerieEntity[],
  comptesRendus: CompteRenduImagerieEntity[],
): fhir4.DiagnosticReport[] {
  return demandes.map((demande, index) => {
    const compteRendu = comptesRendus[index];
    return {
      resourceType: 'DiagnosticReport',
      id: compteRendu.id,
      status: 'final',
      code: { text: demande.typeExamen },
      subject: { reference: `Patient/${demande.patientId}` },
      performer: [{ reference: `Practitioner/${compteRendu.radiologueId}` }],
      effectiveDateTime: demande.dateDemande.toISOString(),
      issued: compteRendu.dateValidation!.toISOString(),
      conclusion: compteRendu.conclusion ?? undefined,
      presentedForm: compteRendu.fichierDicomUrl ? [{ url: compteRendu.fichierDicomUrl }] : undefined,
    };
  });
}
