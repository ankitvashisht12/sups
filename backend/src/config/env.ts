import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  // Slack Configuration
  SLACK_BOT_TOKEN: z.string().startsWith('xoxb-').optional(),
  SLACK_SIGNING_SECRET: z.string().min(1),
  SLACK_CLIENT_ID: z.string().min(1),
  SLACK_CLIENT_SECRET: z.string().min(1),

  // Database Configuration
  DATABASE_URL: z.string().url(),

  // Application Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment validation failed:');
    console.error(result.error.format());
    throw new Error('Invalid environment variables');
  }

  return result.data;
}

export const env = validateEnv();

export type Env = z.infer<typeof envSchema>;
