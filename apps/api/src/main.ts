import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET ?? 'change-me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
      },
    }),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
