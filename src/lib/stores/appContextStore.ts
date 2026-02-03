import { writable } from 'svelte/store';
import type { EndpointInfoStore, SchemaDataStore } from '$lib/types';

interface AppContext {
	endpointInfo: EndpointInfoStore | null;
	schemaData: SchemaDataStore | null;
}

/**
 * Global store to hold the current application context.
 * Used by global components (like Command Palette) to access context-specific data
 * that is normally provided via setContext/getContext in child routes.
 */
export const appContext = writable<AppContext>({
	endpointInfo: null,
	schemaData: null
});
