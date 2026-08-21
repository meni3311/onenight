import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/**
 * Body of PATCH /api/contact-inquiries/:id — admin only.
 *
 * `handled` is the entire workflow this feature has, on purpose: a contact
 * message is either still waiting for a reply or it isn't. Anything richer
 * (assignee, status, thread) would be a support inbox, and the site already
 * has one — the address the messages ask people to write to.
 */
export class UpdateContactInquiryDto {
  @ApiProperty({ description: 'Mark as dealt with (or clear the flag)' })
  @IsBoolean()
  handled!: boolean;
}
