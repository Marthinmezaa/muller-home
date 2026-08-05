import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PackagesModule } from './modules/packages/packages.module';
import { PropertiesModule } from './modules/properties/properties.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, PackagesModule, PropertiesModule],
})
export class AppModule {}
