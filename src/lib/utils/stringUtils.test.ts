import { describe, expect, it } from 'vitest';
import {
	formatData,
	generateListOfSubstrings,
	generateTitleFromStepsOfFields,
	gqlArgObjToString,
	smartModifyStringBasedOnBoundries
} from './stringUtils';

describe('formatData', () => {
	it('returns empty string for invalid lengths', () => {
		expect(formatData('abc', 0)).toBe('');
	});

	it('truncates long strings with middle ellipsis', () => {
		expect(formatData('abcdefghijklmnopqrstuvwxyz', 10, false)).toContain(' ... ');
	});

	it('handles circular objects safely', () => {
		const circular: Record<string, unknown> = {};
		circular.self = circular;
		expect(formatData(circular, 100)).toBe('[Unserializable data]');
	});
});

describe('smartModifyStringBasedOnBoundries', () => {
	it('modifies inside and outside text', () => {
		const result = smartModifyStringBasedOnBoundries(
			'foo(bar)',
			'(',
			')',
			(text) => text.toUpperCase(),
			(text) => text.replace('foo', 'baz')
		);
		expect(result).toBe('baz(BAR)');
	});

	it('applies outside modifier when boundaries are absent', () => {
		const result = smartModifyStringBasedOnBoundries('foo', '(', ')', undefined, (text) =>
			text.toUpperCase()
		);
		expect(result).toBe('FOO');
	});
});

describe('generateListOfSubstrings', () => {
	it('returns empty array for empty input', () => {
		expect(generateListOfSubstrings('')).toEqual([]);
	});

	it('generates at least one substring for valid input', () => {
		const result = generateListOfSubstrings('{"a":("b")}');
		expect(result.length).toBeGreaterThan(0);
	});
});

describe('gqlArgObjToString', () => {
	it('converts an object to gql-like string', () => {
		expect(gqlArgObjToString({ limit: 10, title: 'abc' })).toContain('limit:10');
	});

	it('returns empty string for empty objects', () => {
		expect(gqlArgObjToString({})).toBe('');
	});
});

describe('generateTitleFromStepsOfFields', () => {
	it('joins valid path segments', () => {
		expect(generateTitleFromStepsOfFields(['user', 'profile', 'name'])).toBe('user-profile-name');
	});
});
