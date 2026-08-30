import { Module, Global } from '@nestjs/common';
import { DocsAnalyticsService } from './docs-analytics.service';

@Global()
@Module({
  providers: [DocsAnalyticsService],
  exports: [DocsAnalyticsService],
})
export class DocsAnalyticsModule {}
