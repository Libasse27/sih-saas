import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE_KEY = 'rawResponse';

/** Bypass l'enveloppe `{success,data,message}` — réservé aux endpoints contraints par un format externe (ex. FHIR R4, Phase 11). */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
