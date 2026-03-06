export const PROVIDERS = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "opencode", label: "OpenCode" },
] as const;

export type Provider = (typeof PROVIDERS)[number]["value"];
