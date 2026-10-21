import { Body, Controller, Get, Inject, Param, Post, Req, Res } from '@nestjs/common';
import { ItineraryRequest, Slug } from '@ranhduong/contracts';
import type { Request, Response } from 'express';
import { ENV, type Env } from '../../../config/env';
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe';
import { guestIdentity, readGuestId } from './guest-identity';
import { GuestItinerariesService } from './guest-itineraries.service';
import { GuestRateLimit } from './guest-rate-limit';

@Controller()
export class GuestItinerariesController {
  constructor(private readonly itineraries: GuestItinerariesService, private readonly rate: GuestRateLimit, @Inject(ENV) private readonly env: Env) {}

  @Post('cities/:city/itineraries')
  async create(@Param('city', new ZodValidationPipe(Slug)) city: string, @Body(new ZodValidationPipe(ItineraryRequest)) input: ItineraryRequest, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const guest = guestIdentity(req.headers.cookie, this.env);
    if (guest.cookie) res.cookie('gid', guest.id, guest.cookie);
    await this.rate.check(guest.id, req.ip || req.socket.remoteAddress || 'unknown');
    return this.itineraries.create(city, input, guest.id);
  }

  @Get('itineraries/:shareId')
  read(@Param('shareId') shareId: string, @Req() req: Request) {
    return this.itineraries.read(shareId, readGuestId(req.headers.cookie));
  }
}
