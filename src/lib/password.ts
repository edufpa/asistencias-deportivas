export const MIN_PASSWORD_LENGTH = 6;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Ingresá un correo válido";
  }
  return null;
}

export function validateNewPassword(
  newPassword: string,
  confirm: string
): string | null {
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  if (newPassword !== confirm) {
    return "Las contraseñas no coinciden";
  }
  return null;
}

export function validatePasswordChange(
  currentPassword: string,
  newPassword: string,
  newPasswordConfirm: string
): string | null {
  if (!currentPassword) {
    return "Ingresá tu contraseña actual";
  }
  if (currentPassword === newPassword) {
    return "La nueva contraseña debe ser distinta a la actual";
  }
  return validateNewPassword(newPassword, newPasswordConfirm);
}
