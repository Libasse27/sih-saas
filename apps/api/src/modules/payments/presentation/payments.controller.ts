import { Body, Controller, Get, Headers, Param, Post, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../../shared/decorators/public.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { PaymentsService } from '../application/payments.service';
import { InitierPaymentDto } from './dto/initier-payment.dto';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';

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

  @Public()
  @Post('webhook/:provider')
  @ResponseMessage('Webhook traité.')
  async webhook(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-sandbox-signature') signature: string | undefined,
    @Body() payload: WebhookPayloadDto,
  ) {
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(payload);
    await this.paymentsService.handleWebhook(provider, rawBody, signature, payload);
    return { recu: true };
  }

  @Public()
  @Get('statut/:reference')
  @ResponseMessage('Statut du paiement.')
  statut(@Param('reference') reference: string) {
    return this.paymentsService.getStatut(reference);
  }
}
