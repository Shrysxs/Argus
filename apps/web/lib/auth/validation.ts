const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: unknown): { valid: boolean; error?: string } {
  if (typeof email !== "string" || !email.trim()) {
    return { valid: false, error: "Email address is required." };
  }
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalized)) {
    return { valid: false, error: "Invalid email address format." };
  }
  return { valid: true };
}

export function validatePassword(password: unknown): { valid: boolean; error?: string } {
  if (typeof password !== "string") {
    return { valid: false, error: "Password is required." };
  }
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long." };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one letter and one number." };
  }
  return { valid: true };
}

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: "Too Short" | "Weak" | "Fair" | "Good" | "Strong";
  hasMinLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  if (!password) {
    return { score: 0, label: "Too Short", hasMinLength: false, hasLetter: false, hasNumber: false, hasSpecial: false };
  }

  let rawScore = 0;
  if (hasMinLength) rawScore += 1;
  if (hasLetter) rawScore += 1;
  if (hasNumber) rawScore += 1;
  if (hasSpecial) rawScore += 1;
  if (password.length >= 12) rawScore += 1;

  let score = 0;
  let label: PasswordStrengthResult["label"] = "Too Short";

  if (!hasMinLength) {
    score = 0;
    label = "Too Short";
  } else if (rawScore <= 2) {
    score = 1;
    label = "Weak";
  } else if (rawScore === 3) {
    score = 2;
    label = "Fair";
  } else if (rawScore === 4) {
    score = 3;
    label = "Good";
  } else {
    score = 4;
    label = "Strong";
  }

  return {
    score,
    label,
    hasMinLength,
    hasLetter,
    hasNumber,
    hasSpecial,
  };
}

