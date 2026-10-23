import { ageAt } from "./security";

export const POLICY_VERSION = "2026-10-22";
export const DELETION_TOKEN_MINUTES = 15;

// A service access rule, not a declaration of the age of consent in every country.
export function minimumAccountAge() {
  const value = Number(process.env.MINIMUM_ACCOUNT_AGE || 13);
  if (!Number.isInteger(value) || value < 13 || value > 21) throw new Error("MINIMUM_ACCOUNT_AGE must be an integer from 13 to 21.");
  return value;
}

export function isUnder18(birthDate: Date | null, now = new Date()) {
  return ageAt(birthDate, now) < 18;
}

export function adultBirthDateCutoff(now = new Date()) {
  const cutoff = new Date(Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate()));
  if (cutoff.getUTCMonth() !== now.getUTCMonth()) cutoff.setUTCDate(0);
  return cutoff;
}

export const protectedPrivacy = { publicProfile: false, showActivity: false, allowFriendRequests: false } as const;
