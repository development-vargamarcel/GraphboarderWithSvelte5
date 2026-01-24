/**
 * This module aggregates and re-exports utility functions from various sub-modules.
 * It serves as a central entry point for common utility functions used throughout the application.
 */

export * from './typeUtils';
export * from './objectUtils';
export * from './stringUtils';
export * from './serializationUtils';
export * from './graphql/graphql-builder';
export * from './graphql/schema-traversal';
export * from './graphql/data-processing';

/**
 * Common utility types and helper functions are re-exported here for convenience.
 *
 * - `typeUtils`: Low-level type checking (isString, isArray, etc.)
 * - `objectUtils`: Deep object manipulation and traversal
 * - `stringUtils`: String formatting and generation
 * - `serializationUtils`: JSON parsing/stringifying helpers
 * - `graphql-builder`: Helpers for constructing GraphQL queries
 * - `schema-traversal`: Helpers for navigating the GraphQL schema
 * - `data-processing`: Helpers for processing and formatting data for tables
 */
