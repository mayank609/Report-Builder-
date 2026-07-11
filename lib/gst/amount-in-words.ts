const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function twoDigitsToWords(n: number): string {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones ? `${TENS[tens]} ${ONES[ones]}` : TENS[tens];
}

function threeDigitsToWords(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(twoDigitsToWords(rest));
  return parts.join(" ");
}

/**
 * Converts an amount to words using the Indian numbering system
 * (crore / lakh / thousand / hundred), as conventionally printed on
 * GST tax invoices, e.g. 1234567.5 -> "Twelve Lakh Thirty Four Thousand
 * Five Hundred Sixty Seven Rupees and Fifty Paise Only".
 */
export function amountInWords(amount: number, currencyLabel = "Rupees", subunitLabel = "Paise"): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);

  const segments: { value: number; label: string }[] = [
    { value: Math.floor(rupees / 10000000), label: "Crore" },
    { value: Math.floor((rupees / 100000) % 100), label: "Lakh" },
    { value: Math.floor((rupees / 1000) % 100), label: "Thousand" },
    { value: rupees % 1000, label: "" },
  ];

  const words = segments
    .map(({ value, label }) => {
      if (value === 0) return "";
      const text = label === "" ? threeDigitsToWords(value) : twoDigitsToWords(value);
      return label ? `${text} ${label}` : text;
    })
    .filter(Boolean)
    .join(" ");

  const rupeesWords = words || "Zero";
  const prefix = isNegative ? "Minus " : "";
  const paiseWords = paise > 0 ? ` and ${twoDigitsToWords(paise)} ${subunitLabel}` : "";

  return `${prefix}${rupeesWords} ${currencyLabel}${paiseWords} Only`;
}
