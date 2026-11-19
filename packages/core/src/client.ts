/**
 * Browser-safe entry point: types, constants and pure helpers only (no Node built-ins).
 * Client components import from "@todos/core/client"; server code imports from "@todos/core".
 */
export * from './todo';
export * from './label';
export { ERROR_CODES, type ErrorCode } from './errors';
