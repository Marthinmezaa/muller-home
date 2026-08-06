import { Module } from '@nestjs/common';
import { PropertiesModule } from '../properties/properties.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [PropertiesModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
