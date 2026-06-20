import { Body, Controller, Get, Headers, Param, Post, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../../shared/decorators/public.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { PaymentsService } from '../application/payments.service';
import { InitierPaymentDto } from './dto/initier-payment.dto';

@ApiTags('Paiements (abonnement)')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('initier')
  @ResponseMessage('Paiement initié.')
  initier(@Body() dto: InitierPaymentDto) {
    return this.paymentsService.initier(dto);
  }

  // @Body() volontairement absent : chaque fournisseur (sandbox/Wave/Orange Money) a son propre
  // format de payload — PaymentGateway.extraireStatutPaiement() le parse depuis rawBody, jamais
  // une DTO unique côté contrôleur (voir payment-gateway.interface.ts).
  @Public()
  @Post('webhook/:provider')
  @ResponseMessage('Webhook traité.')
  async webhook(@Param('provider') provider: string, @Req() req: RawBodyRequest<Request>, @Headers() headers: Record<string, string>) {
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    await this.paymentsService.handleWebhook(provider, rawBody, headers);
    return { recu: true };
  }

  @Public()
  @Get('statut/:reference')
  @ResponseMessage('Statut du paiement.')
  statut(@Param('reference') reference: string) {
    return this.paymentsService.getStatut(reference);
  }
}
