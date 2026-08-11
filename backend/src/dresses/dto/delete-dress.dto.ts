import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

/**
 * Proof of ownership for an owner-initiated delete.
 *
 * The email is the app's whole notion of who owns a listing — there is no
 * bearer token to check instead (see DressesService.deleteDress). Sent in the
 * body rather than the query string so it stays out of server access logs and
 * browser history.
 */
export class DeleteDressDto {
  @ApiProperty({ description: "The requesting account's email address" })
  @IsEmail({}, { message: 'כתובת מייל לא תקינה' })
  email!: string;
}
