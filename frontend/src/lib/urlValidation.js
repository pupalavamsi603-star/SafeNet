export function validateURL(value) {
  const input = value.trim();
  if (!input) return "Enter a website or link to check.";
  if (input.length > 2000 || /\s/.test(input)) return "Enter a valid URL without spaces (up to 2,000 characters).";
  try {
    const parsed = new URL(input.includes(":") ? input : `https://${input}`);
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname.includes(".")) throw new Error();
    return "";
  } catch { return "Enter a valid website, such as example.com or https://example.com."; }
}
