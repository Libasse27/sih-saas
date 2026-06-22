import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../../shared/decorators/public.decorator';
import { RawResponse } from '../../../shared/decorators/raw-response.decorator';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { DossierMedicalService } from '../application/dossier-medical.service';
import { DmeAttachmentsLinkService } from '../infrastructure/storage/dme-attachments-link.service';

/**
 * Téléchargement par lien signé/expirant (prompt maître §17) — `@Public()` délibérément : le token
 * lui-même EST l'autorisation (comme une URL pré-signée S3), aucun bearer JWT n'est requis ni attendu
 * ici. Contrôleur séparé de DossierMedicalController (pas de :patientId dans l'URL, pas de
 * CareContextGuard — la vérification du token tient lieu d'autorisation).
 */
@ApiExcludeController()
@Controller('dossier-medical/pieces-jointes')
export class DossierMedicalTelechargementController {
  constructor(
    private readonly dossierMedicalService: DossierMedicalService,
    private readonly linkService: DmeAttachmentsLinkService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Public()
  @RawResponse()
  @Get('telechargement')
  async telecharger(@Query('token') token: string, @Res() res: Response): Promise<void> {
    const { patientId, etablissementId, pieceJointeId } = this.linkService.verifierToken(token);

    const { buffer, piece } = await this.tenantContext.runForEtablissement(etablissementId, () =>
      this.dossierMedicalService.lireContenuPieceJointe(patientId, pieceJointeId),
    );

    res.set({
      'Content-Type': piece.type,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(piece.nomOriginal)}"`,
      'Content-Length': buffer.byteLength,
    });
    res.send(buffer);
  }
}
