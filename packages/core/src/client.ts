/**
 * Browser-safe entry point: types and constants only (no Node built-ins).
 * Client components import from "@todos/core/client"; server code imports from "@todos/core".
 */
export * from './todo';
export { ERROR_CODES, type ErrorCode } from './errors';
