// Card processors append reference codes that change on every charge ("PAYPAL *SPOTIFY*P49A7B2" vs
// "PAYPAL *SPOTIFY*P499C61"), so merchants are remembered by their words without codes, numbers or punctuation.
export function merchantKey(description: string | null | undefined) {
  if (!description) return null;
  const words = description
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word.length >= 2 && !/\d/.test(word))
    .slice(0, 3);
  return words.length ? words.join(" ") : null;
}

const PROCESSOR_PREFIX = /^\s*(?:PAYPAL|PP|SQ|SP|TST|POS|ZTL|IZ|DD|APPLE\.COM\/BILL|GOOGLE)\s*\*+\s*/i;

function tidyWord(word: string) {
  return word.length <= 3 ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1).toLowerCase();
}

// "PAYPAL *SPOTIFY*P49A7B2" -> "Spotify", "NP FUEL STATION #22" -> "NP Fuel Station".
export function cleanMerchantName(description: string | null | undefined) {
  if (!description) return null;
  const words = description
    .replace(PROCESSOR_PREFIX, "")
    .replace(/[*#]+/g, " ")
    .split(/\s+/)
    .filter((word) => word && !/\d/.test(word))
    .slice(0, 4);
  const name = words.map(tidyWord).join(" ").trim();
  return name.length >= 2 ? name : null;
}
