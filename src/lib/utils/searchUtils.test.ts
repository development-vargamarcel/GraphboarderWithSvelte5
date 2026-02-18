import { describe, expect, it } from 'vitest';
import { createQMSSearchInstance, discoverMatchingQMS, getReturningFields } from './searchUtils';

const schemaData = {
	queryFields: [
		{ dd_displayName: 'Users', dd_rootName: 'user', dd_kindList: true },
		{ dd_displayName: 'Accounts', dd_rootName: 'account', dd_kindList: true },
		{ dd_displayName: 'User', dd_rootName: 'user', dd_kindList: false }
	],
	get_rootType: (_ctx: unknown, rootName: string | undefined) => {
		if (rootName === 'Root') {
			return {
				fields: [
					{ dd_displayName: 'users', dd_rootName: 'user' },
					{ dd_displayName: 'accounts', dd_rootName: 'account' }
				]
			};
		}
		return { fields: [] };
	}
};

describe('createQMSSearchInstance', () => {
	it('clamps invalid threshold values', () => {
		const fuse = createQMSSearchInstance(schemaData.queryFields, 5);
		expect(fuse.search('user').length).toBeGreaterThan(0);
	});
});

describe('getReturningFields', () => {
	it('finds fields in current root type', () => {
		const fields = getReturningFields(
			{ dd_rootName: 'Root' },
			{ dd_displayName: 'users' },
			schemaData,
			0,
			2
		);
		expect(fields?.length).toBe(2);
	});

	it('returns null when type is missing', () => {
		expect(getReturningFields(undefined, { dd_displayName: 'users' }, schemaData)).toBeNull();
	});
});

describe('discoverMatchingQMS', () => {
	it('returns exact list matches first', () => {
		const fuse = createQMSSearchInstance(schemaData.queryFields);
		const result = discoverMatchingQMS(
			{ dd_displayName: 'users', dd_rootName: 'user' },
			{ originType: { dd_rootName: 'Root' } },
			schemaData,
			fuse
		);
		expect(result[0].dd_rootName).toBe('user');
		expect(result.every((item) => item.dd_kindList)).toBe(true);
	});

	it('returns empty array when no search term exists', () => {
		const fuse = createQMSSearchInstance(schemaData.queryFields);
		const result = discoverMatchingQMS(
			{},
			{ originType: { dd_rootName: 'Root' } },
			schemaData,
			fuse
		);
		expect(result).toEqual([]);
	});
});
