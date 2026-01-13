import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// For connection pooling in production
const connectionString = process.env.DATABASE_URL!;

// Create postgres client
// In production, use connection pooling
const client = postgres(connectionString, {
  max: process.env.NODE_ENV === 'production' ? 10 : 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle database instance with schema
export const db = drizzle(client, { schema });

// Export schema for convenience
export * from './schema.js';

// Export client for manual connection management if needed
export { client };
