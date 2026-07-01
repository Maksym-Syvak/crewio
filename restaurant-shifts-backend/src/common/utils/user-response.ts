import { User } from '../../modules/users/entities/user.entity';

export function toPublicUser(user: User, passwordHash?: string | null) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, deleted_at, is_deleted, ...rest } = user;
  return {
    ...rest,
    has_password: Boolean(passwordHash ?? password_hash),
  };
}
