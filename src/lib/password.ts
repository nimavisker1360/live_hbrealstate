import bcrypt from "bcryptjs";

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export async function verifyPassword(password: string, passwordHash: string) {
  const hash = passwordHash.trim();

  if (!password || !hash) {
    return false;
  }

  if (BCRYPT_HASH_PATTERN.test(hash)) {
    return bcrypt.compare(password, hash);
  }

  return false;
}
