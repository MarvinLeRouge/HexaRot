import { IsBoolean } from 'class-validator';

/** Request body for PATCH /admin/users/:id. */
export class UpdateUserActiveDto {
  @IsBoolean()
  active!: boolean;
}
