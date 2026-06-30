export function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
