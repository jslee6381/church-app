export const PROTECTED_ADMIN_EMAIL = "leejs6381@gmail.com";

export function isProtectedAdminEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === PROTECTED_ADMIN_EMAIL;
}
