import { vi } from 'vitest';

// Mock environment variables for tests
process.env['NODE_ENV'] = 'test';
process.env['ANTHROPIC_API_KEY'] = 'test-api-key';
process.env['PORT'] = '3001';
process.env['LOG_LEVEL'] = 'error';

// Mock pino to avoid log output during tests
vi.mock('pino', () => ({
  default: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
  }),
}));
