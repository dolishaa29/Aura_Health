import { parsePhoneNumberFromString } from "libphonenumber-js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (email) => {
  const s = String(email || "").trim();
  if (!s) return "Email is required";
  if (!EMAIL_RE.test(s)) return "Enter a valid email address";
  return null;
};

export const validatePassword = (password) => {
  const p = String(password || "");
  if (!p) return "Password is required";
  if (p.length < 8) return "Use at least 8 characters";
  if (!/[A-Za-z]/.test(p)) return "Include at least one letter";
  if (!/[0-9]/.test(p)) return "Include at least one number";
  return null;
};

/** value = E.164 from PhoneNumber when valid */
export const validatePhoneE164 = (value) => {
  if (!value || !String(value).trim()) return "Phone number is required";
  const parsed = parsePhoneNumberFromString(String(value).trim());
  if (!parsed?.isValid()) return "Enter a valid phone number for the selected country";
  return null;
};
