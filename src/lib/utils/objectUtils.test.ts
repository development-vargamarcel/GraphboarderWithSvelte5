import { describe, it, expect } from 'vitest';
import {
	deleteIfChildrenHaveOneKeyAndLastKeyIsQMSarguments,
	passAllObjectValuesThroughStringTransformerAndReturnNewObject,
    objectIsEmpty,
    sortByName,
    filterElFromArr,
    hasDeepProperty,
    getValueAtPath,
    setValueAtPath,
    deleteValueAtPath
} from './objectUtils';

describe('deleteIfChildrenHaveOneKeyAndLastKeyIsQMSarguments', () => {
	it('should NOT delete a field that has non-empty QMSarguments', () => {
		const obj = {
			items: {
				name: {
					QMSarguments: { uppercase: true }
				}
			}
		};
		const result = deleteIfChildrenHaveOneKeyAndLastKeyIsQMSarguments(JSON.parse(JSON.stringify(obj)));
		expect(result).toEqual({
			items: {
				name: {
					QMSarguments: { uppercase: true }
				}
			}
		});
	});

	it('should delete a field that has EMPTY QMSarguments and no other keys', () => {
		const obj = {
			items: {
				name: {
					QMSarguments: {}
				}
			}
		};
		const result = deleteIfChildrenHaveOneKeyAndLastKeyIsQMSarguments(JSON.parse(JSON.stringify(obj)));
		expect(result).toEqual({});
	});

	it('should NOT delete a field that has other keys besides QMSarguments', () => {
		const obj = {
			items: {
				name: {
					QMSarguments: {},
					otherKey: 'value'
				}
			}
		};
		const result = deleteIfChildrenHaveOneKeyAndLastKeyIsQMSarguments(JSON.parse(JSON.stringify(obj)));
		expect(result).toEqual({
			items: {
				name: {
					QMSarguments: {},
					otherKey: 'value'
				}
			}
		});
	});
});

describe('objectIsEmpty', () => {
	it('should return true for empty object', () => {
		expect(objectIsEmpty({})).toBe(true);
	});
	it('should return false for non-empty object', () => {
		expect(objectIsEmpty({ a: 1 })).toBe(false);
	});
});

describe('sortByName', () => {
	it('should sort array of objects by name', () => {
		const arr = [{ name: 'c' }, { name: 'a' }, { name: 'b' }];
		expect(sortByName(arr)).toEqual([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
	});
});

describe('filterElFromArr', () => {
	it('should filter elements', () => {
		expect(filterElFromArr([1, 2, 3, 4], [2, 4])).toEqual([1, 3]);
	});
});

describe('hasDeepProperty', () => {
	it('should check for deep property', () => {
		const obj = { a: { b: { c: 1 } } };
		expect(hasDeepProperty(obj, ['a', 'b', 'c'])).toBe(true);
		expect(hasDeepProperty(obj, ['a', 'b', 'd'])).toBe(false);
	});
});

describe('getValueAtPath', () => {
	it('should get value at path', () => {
		const obj = { a: { b: { c: 1 } } };
		expect(getValueAtPath(obj, ['a', 'b', 'c'])).toBe(1);
		expect(getValueAtPath(obj, ['a', 'b', 'd'])).toBeUndefined();
	});
});

describe('setValueAtPath', () => {
	it('should set value at path', () => {
		const obj = {};
		setValueAtPath(obj, ['a', 'b', 'c'], 1);
		expect(obj).toEqual({ a: { b: { c: 1 } } });
	});
});

describe('deleteValueAtPath', () => {
	it('should delete value at path', () => {
		const obj = { a: { b: { c: 1 } } };
		deleteValueAtPath(obj, ['a', 'b', 'c']);
		expect(obj).toEqual({ a: { b: {} } });
	});
});
