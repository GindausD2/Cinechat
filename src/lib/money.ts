// Stripe presentment amounts use minor units; ISK/UGX retain a two-decimal API
// representation for backwards compatibility even though fractional charges are disallowed.
const zeroDecimal = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "vnd", "vuv", "xaf", "xof", "xpf"]);
export function formatMinorAmount(amount: number, currency: string) { return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount / (zeroDecimal.has(currency.toLowerCase()) ? 1 : 100)); }
