import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Outbound email, available everywhere.
 *
 * `@Global` for the same reason PrismaModule is: this is one stateless client
 * around one external service, and making every feature module that ever
 * needs to notify someone import a MailModule is wiring without a decision in
 * it. Import once in AppModule; inject MailService anywhere.
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
