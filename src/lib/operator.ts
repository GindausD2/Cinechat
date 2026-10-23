// Server-side, founder-supplied public disclosures. Never infer legal identity
// or support addresses from repository ownership, email senders or domains.
export function operatorDetails() {
  const email = (value: string | undefined) => value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
  return {
    name: process.env.CINECHAT_OPERATOR_NAME || null,
    legalEntity: process.env.CINECHAT_LEGAL_ENTITY || null,
    address: process.env.CINECHAT_BUSINESS_ADDRESS || null,
    supportEmail: email(process.env.CINECHAT_SUPPORT_EMAIL),
    privacyEmail: email(process.env.CINECHAT_PRIVACY_EMAIL),
    copyrightEmail: email(process.env.CINECHAT_COPYRIGHT_EMAIL),
    countries: process.env.CINECHAT_LAUNCH_COUNTRIES || null
  };
}
