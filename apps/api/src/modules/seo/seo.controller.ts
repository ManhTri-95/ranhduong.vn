import { Controller, Get, Param } from '@nestjs/common';
import { SitemapKind } from '@ranhduong/contracts';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { SeoService } from './seo.service';

@Controller('seo')
export class SeoController {
  constructor(private readonly seo: SeoService) {}
  @Get('sitemap/:kind')
  sitemap(@Param('kind', new ZodValidationPipe(SitemapKind)) kind: SitemapKind) { return this.seo.sitemap(kind); }
}
