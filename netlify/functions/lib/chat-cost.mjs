export function reserveCost(instructions, input, config) {
  const upperInput =
    Buffer.byteLength(instructions, 'utf8') +
    Buffer.byteLength(JSON.stringify(input), 'utf8') +
    512 +
    input.length * 32;
  return (
    Math.ceil(
      ((upperInput * config.input_usd + config.max_output_tokens * config.output_usd) / 1e6) *
        config.usd_brl *
        1e6,
    ) / 1e6
  );
}
export function actualCost(usage, config) {
  return (
    (((Number(usage.input_tokens) || 0) * config.input_usd +
      (Number(usage.output_tokens) || 0) * config.output_usd) /
      1e6) *
    config.usd_brl
  );
}
export function extractText(result) {
  return (result.output || [])
    .filter((x) => x.type === 'message')
    .flatMap((x) => x.content || [])
    .filter((x) => x.type === 'output_text')
    .map((x) => x.text)
    .join('\n')
    .trim();
}
