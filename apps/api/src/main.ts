import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true — nécessaire pour vérifier la signature HMAC des webhooks de paiement
  // sur le corps brut exact (voir PaymentsController.webhook / SandboxPaymentGateway).
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({ origin: config.get<string[]>('corsOrigins'), credentials: true });
  app.setGlobalPrefix(config.get<string>('apiPrefix') ?? 'api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SIH SaaS — API')
    .setDescription('API de la plateforme SaaS multi-établissements de gestion hospitalière')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${config.get<string>('apiPrefix') ?? 'api'}/docs`, app, swaggerDocument);

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
}

bootstrap();
