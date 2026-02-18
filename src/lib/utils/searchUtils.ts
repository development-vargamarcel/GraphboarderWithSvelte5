/**
 * Utility functions for search and QMS discovery.
 */
import Fuse from 'fuse.js';

interface SearchableField {
	dd_displayName?: string;
	dd_rootName?: string;
	description?: string;
	dd_kindList?: boolean;
}

const SEARCH_KEYS: Array<keyof SearchableField> = ['dd_displayName', 'dd_rootName', 'description'];

function clampThreshold(threshold: number): number {
	if (!Number.isFinite(threshold)) {
		return 0.8;
	}
	return Math.min(Math.max(threshold, 0), 1);
}

function normalizeSearchText(value: string | undefined): string {
	return (value ?? '').replaceAll('_', ' ').trim();
}

function dedupeByRootName(items: SearchableField[]): SearchableField[] {
	const seen = new Set<string>();
	return items.filter((item) => {
		const key = `${item.dd_rootName ?? ''}:${item.dd_displayName ?? ''}`;
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}

/**
 * Creates a Fuse.js search instance for QMS fields.
 */
export function createQMSSearchInstance(
	queryFields: SearchableField[],
	threshold: number = 0.8
): Fuse<SearchableField> {
	return new Fuse(queryFields ?? [], {
		includeScore: false,
		includeMatches: false,
		threshold: clampThreshold(threshold),
		keys: SEARCH_KEYS
	});
}

/**
 * Recursively finds fields that match a given field in a type hierarchy.
 */
export function getReturningFields(
	type: { dd_rootName?: string } | undefined,
	matchingField: { dd_displayName?: string },
	schemaData: any,
	depth: number = 0,
	maxDepth: number = 2
): SearchableField[] | null {
	if (!type || depth > maxDepth || !schemaData?.get_rootType) {
		return null;
	}

	const nextDepth = depth + 1;
	const rootType = schemaData.get_rootType(null, type.dd_rootName, schemaData);
	const fields = rootType?.fields;
	if (!fields?.length) {
		return null;
	}

	const myField = fields.find(
		(field: SearchableField) => field.dd_displayName === matchingField.dd_displayName
	);
	if (myField) {
		return fields;
	}

	let returningFields: SearchableField[] | null = null;
	fields.find((field: SearchableField) => {
		returningFields = getReturningFields(field, matchingField, schemaData, nextDepth, maxDepth);
		return returningFields;
	});

	return returningFields;
}

/**
 * Discovers QMS queries that match a given node using exact and fuzzy fallback strategies.
 */
export function discoverMatchingQMS(
	node: { dd_displayName?: string; dd_rootName?: string },
	group: { originType?: { dd_rootName?: string } },
	schemaData: any,
	fuse: Fuse<SearchableField>,
	maxResults = 20
): SearchableField[] {
	const originType = group?.originType;
	const fields = getReturningFields(originType, node, schemaData);
	const myField = fields?.find((field) => field.dd_displayName === node.dd_displayName);

	if (myField?.dd_rootName) {
		const exactMatches = (schemaData.queryFields ?? []).filter(
			(item: SearchableField) => item.dd_kindList && item.dd_rootName === myField.dd_rootName
		);
		if (exactMatches.length > 0) {
			return dedupeByRootName(exactMatches).slice(0, maxResults);
		}

		const fuzzyMatches = fuse
			.search(myField.dd_rootName)
			.map((item) => item.item)
			.filter((item) => item.dd_kindList);
		if (fuzzyMatches.length > 0) {
			return dedupeByRootName(fuzzyMatches).slice(0, maxResults);
		}
	}

	const nodeSearchTerm =
		`${normalizeSearchText(node?.dd_rootName)} ${normalizeSearchText(node?.dd_displayName)}`.trim();
	if (!nodeSearchTerm) {
		return [];
	}

	const nodeMatches = fuse
		.search(nodeSearchTerm)
		.map((item) => item.item)
		.filter((item) => item.dd_kindList);
	if (nodeMatches.length > 0) {
		return dedupeByRootName(nodeMatches).slice(0, maxResults);
	}

	const allMatches = fuse.search(nodeSearchTerm).map((item) => item.item);
	return dedupeByRootName(allMatches).slice(0, maxResults);
}
