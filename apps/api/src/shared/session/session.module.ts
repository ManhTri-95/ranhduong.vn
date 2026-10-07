import { Global, Module } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { SessionStore } from './session.store';

/** Phiên và AdminGuard dùng chung: controller quản trị ở mọi module chỉ cần @UseGuards(AdminGuard). */
@Global()
@Module({ providers: [SessionStore, AdminGuard], exports: [SessionStore, AdminGuard] })
export class SessionModule {}
