import { Module } from '@nestjs/common';
import { StorageModule } from '../../storage/storage.module';
import { PackagesModule } from '../packages/packages.module';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  imports: [StorageModule, PackagesModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
})
export class PropertiesModule {}
