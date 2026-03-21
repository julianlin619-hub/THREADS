export function normalizeTweetText(raw: string): string {
  let text = raw;
  text = text.replace(/([.:]) {2,}([A-Z])/g, '$1 $2'); // collapse 2+ spaces → 1
  text = text.replace(/([.:])([A-Z])/g, '$1 $2');       // insert missing space
  return text;
}
