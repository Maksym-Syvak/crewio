import { User } from '../../modules/users/entities/user.entity';

export function toPublicUser(user: User) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, deleted_at, is_deleted, ...rest } = user;
  return rest;
}
