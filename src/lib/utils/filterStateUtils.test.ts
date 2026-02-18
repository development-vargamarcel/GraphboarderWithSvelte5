import { describe, expect, it } from 'vitest';
import {
	createChoisesWithId,
	getFilterButtonClasses,
	getFilterDisplayInfo,
	syncChoiceOrder,
	toggleFilterChoice
} from './filterStateUtils';

describe('syncChoiceOrder', () => {
	it('keeps selected choices aligned with source order and removes duplicates', () => {
		const result = syncChoiceOrder(
			[
				{ id: 'a', title: 'A' },
				{ id: 'a-dup', title: 'A' },
				{ id: 'b', title: 'B' }
			],
			['B', 'A']
		);
		expect(result.chosenNew).toEqual(['A', 'B']);
		expect(result.choisesNew).toEqual(['A', 'B']);
	});
});

describe('getFilterButtonClasses', () => {
	it('returns primary classes when selection differs from default', () => {
		const classes = getFilterButtonClasses(['a'], ['b'], true, false);
		expect(classes.btnExtraClass).toContain('btn-primary');
	});
});

describe('getFilterDisplayInfo', () => {
	it('uses title and count for checkbox filters', () => {
		const info = getFilterDisplayInfo('checkbox', ['A', 'B'], 'Filter', false);
		expect(info.title).toBe('Filter');
		expect(info.extraInfo).toBe('2');
	});

	it('falls back to title when toggle has no selection', () => {
		const info = getFilterDisplayInfo('toggle', [], 'Filter', true);
		expect(info.title).toBe('Filter');
	});
});

describe('toggleFilterChoice', () => {
	it('toggles radio choice', () => {
		expect(toggleFilterChoice('radio', ['A'], undefined)).toBe('A');
		expect(toggleFilterChoice('radio', ['A'], 'A')).toBeUndefined();
	});

	it('toggles checkbox list', () => {
		expect(toggleFilterChoice('checkbox', ['A', 'A', 'B'], [])).toEqual(['A', 'B']);
		expect(toggleFilterChoice('checkbox', ['A'], ['A'])).toBeUndefined();
	});
});

describe('createChoisesWithId', () => {
	it('creates normalized ids and removes duplicate/empty entries', () => {
		const choices = createChoisesWithId(['Alpha One', '', 'Alpha One', 'Beta']);
		expect(choices).toEqual([
			{ id: 'alpha-one', title: 'Alpha One' },
			{ id: 'beta', title: 'Beta' }
		]);
	});
});
