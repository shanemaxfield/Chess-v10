/**
 * LLM Configuration
 *
 * Uses environment variables for secure API key management.
 * Create a .env file in the root directory with your API key.
 */

export const LLM_CONFIG = {
  // In Vite, environment variables must be prefixed with VITE_
  // to be exposed to the client
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY || '',
  MODEL: 'gpt-4o-mini',
  MAX_TOKENS: 500,
  TEMPERATURE: 0.7,
};
