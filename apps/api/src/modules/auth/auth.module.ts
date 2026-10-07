import { Module } from '@nestjs/common';
import { ENV, type Env } from '../../config/env';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleOAuth, GoogleOAuthClient } from './google-oauth.client';
import { OAuthStateStore } from './oauth-state.store';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    OAuthStateStore,
    {
      provide: GoogleOAuth,
      inject: [ENV],
      useFactory: (env: Env) =>
        new GoogleOAuthClient({
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          // Phải khớp prefix /v1 trong configureApp và redirect URI khai trên Google Auth Platform.
          redirectUri: `${env.API_PUBLIC_URL}/v1/auth/google/callback`,
        }),
    },
  ],
})
export class AuthModule {}
