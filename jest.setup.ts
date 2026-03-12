import '@testing-library/jest-dom';

// Force UTC for all tests to ensure consistent date formatting
process.env.TZ = 'UTC';

// Node 22+ (which the user is running) has global fetch, Request, Response, TextEncoder, TextDecoder, etc.
// No polyfills needed if running in 'node' test environment.
