export function formatRMB(str: string) {
  if (!str) return str;
  const num = parseFloat(str.replace(/,/g, ""));
  if (num >= 1e8) {
    return (num / 1e8).toFixed(2) + " 亿";
  } else if (num >= 1e4) {
    return (num / 1e4).toFixed(2) + " 万";
  } else {
    return num.toString() + " 元";
  }
}
