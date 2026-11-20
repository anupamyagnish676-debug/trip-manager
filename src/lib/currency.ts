export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (INR ₹)' },
  { code: 'USD', symbol: '$', label: 'US Dollar (USD $)' },
  { code: 'EUR', symbol: '€', label: 'Euro (EUR €)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (GBP £)' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (AUD A$)' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (CAD C$)' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar (SGD S$)' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen (JPY ¥)' },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc (CHF)' },
];

export function getCurrencySymbol(code?: string): string {
  if (!code) return '₹';
  const match = SUPPORTED_CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return match?.symbol || code;
}

export function formatMoney(amount: number, currencyCode?: string): string {
  const sym = getCurrencySymbol(currencyCode);
  const rounded = Math.round(amount * 100) / 100;
  const isNegative = rounded < 0;
  const absVal = Math.abs(rounded);
  
  // Format with commas
  const parts = absVal.toLocaleString('en-US', {
    minimumFractionDigits: absVal % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return `${isNegative ? '-' : ''}${sym}${parts}`;
}
