import { string_transformer } from '$lib/utils/dataStructureTransformers';
import { getPreciseType } from './typeUtils';

/**
 * Recursively searches for a nested object that has multiple keys or contains 'QMSarguments'.
 * Used to navigate complex nested structures in QMS objects.
 * @param {unknown} obj
 * @returns {Record<string, unknown> | boolean | null}
 */
export const findNestedChildWithMultipleKeysOrIfLastHasQMSargumentsKey = (
	obj: unknown
): Record<string, unknown> | boolean | null => {
	// Check if the input is an object
	if (typeof obj !== 'object' || obj === null) {
		return null;
	}
	const typedObj = obj as Record<string, unknown>;
	const objectKeys = Object.keys(typedObj);
	const objectKeysLength = objectKeys.length;
	if (objectKeysLength > 1) {
		return typedObj;
	}
	if (Object.prototype.hasOwnProperty.call(typedObj, 'QMSarguments') && objectKeysLength == 1) {
		return true;
	}
	if (objectKeysLength == 1) {
		return findNestedChildWithMultipleKeysOrIfLastHasQMSargumentsKey(typedObj[objectKeys[0]]);
	}
	return null;
};

/**
 * Recursively deletes properties from an object if they have only one key and that key is 'QMSarguments'.
 * @param {unknown} obj - The object to clean.
 * @returns {Record<string, unknown> | null} - The cleaned object or null if input is invalid.
 */
export const deleteIfChildrenHaveOneKeyAndLastKeyIsQMSarguments = (
	obj: unknown
): Record<string, unknown> | null => {
	if (getPreciseType(obj) !== 'object' || obj === null) {
		return null;
	}
	const typedObj = obj as Record<string, any>;
	///
	///
	for (const key in typedObj) {
		if (!Object.prototype.hasOwnProperty.call(typedObj, key)) continue;

		const child = typedObj[key];
		if (!child || typeof child !== 'object') continue;

		const keys = Object.keys(child);
		const numberOfKeys = keys.length;
		if (numberOfKeys == 1 && child[keys[0]] == 'QMSarguments') {
			delete typedObj[key];
			// Recursive call or loop should continue?
			// Original code returned undefined here which caused error.
			// Assuming we should return the object.
			return typedObj;
		}
		const result = findNestedChildWithMultipleKeysOrIfLastHasQMSargumentsKey(child);
		if (result === true) {
			delete typedObj[key];
		}
		if (getPreciseType(result) == 'object') {
			deleteIfChildrenHaveOneKeyAndLastKeyIsQMSarguments(child);
		}
	}
	return typedObj as Record<string, unknown>;
};

/**
 * Checks if an object is empty (has no own enumerable properties).
 * @param {Record<string, unknown>} obj - The object to check.
 * @returns {boolean} - True if empty, false otherwise.
 */
export const objectIsEmpty = (obj: Record<string, unknown>): boolean => {
	if (Object.keys(obj).length === 0 && obj.constructor === Object) {
		return true;
	} else {
		return false;
	}
};

/**
 * Sorts an array of objects by their 'name' property.
 * @template T
 * @param {T[]} array - The array to sort.
 * @returns {T[]} - The sorted array.
 */
export const sortByName = <T extends { name?: string }>(array: T[]): T[] => {
	array?.sort((a, b) => {
		const nameA = a?.name || '';
		const nameB = b?.name || '';
		if (nameA < nameB) {
			return -1;
		}
		if (nameA > nameB) {
			return 1;
		}
		return 0;
	});

	return array;
};

/**
 * Filters out undesired elements from an array.
 * @template T
 * @param {T[]} arr - The source array.
 * @param {T[]} undesiredElements - The elements to remove.
 * @returns {T[]} - The filtered array.
 */
export const filterElFromArr = <T>(arr: T[], undesiredElements: T[] = []): T[] => {
	return arr.filter((el) => {
		return !undesiredElements.includes(el);
	});
};

/**
 * Checks if a nested property exists within an object based on a path of keys.
 * @param {Record<string, unknown>} obj - The object to search.
 * @param {string[]} propertyPath - The path of keys.
 * @returns {boolean} - True if the deep property exists.
 */
export const hasDeepProperty = (obj: Record<string, unknown>, propertyPath: string[]): boolean => {
	let currentObj = obj;
	for (let i = 0; i < propertyPath.length; i++) {
		const prop = propertyPath[i];
		if (!Object.prototype.hasOwnProperty.call(currentObj, prop)) {
			return false;
		}
		currentObj = currentObj[prop] as Record<string, unknown>;
	}
	return true;
};

/**
 * Recursively transforms all string values in an object using `string_transformer`.
 * @param {Record<string, unknown>} obj - The input object.
 * @returns {Record<string, unknown>} - A new object with transformed values.
 */
export const passAllObjectValuesThroughStringTransformerAndReturnNewObject = (
	obj: Record<string, unknown>
): Record<string, unknown> => {
	const newObj = { ...obj };

	Object.keys(newObj).forEach((key) => {
		const value = newObj[key];
		const type = getPreciseType(value);

		if (type === 'string') {
			newObj[key] = string_transformer(value);
		} else if (type === 'object') {
			newObj[key] = passAllObjectValuesThroughStringTransformerAndReturnNewObject(
				value as Record<string, unknown>
			);
		} else if (type === 'array') {
			newObj[key] = (value as unknown[]).map((item) => {
				const itemType = getPreciseType(item);
				if (itemType === 'string') {
					return string_transformer(item);
				} else if (itemType === 'object') {
					return passAllObjectValuesThroughStringTransformerAndReturnNewObject(
						item as Record<string, unknown>
					);
				}
				// Handle array of arrays if needed, but for now just single level array of objects or strings is common
				return item;
			});
		}
	});
	return newObj;
};

/**
 * Retrieves a value from a nested object based on a path of keys.
 * @param {Record<string, unknown>} obj - The source object.
 * @param {string[]} path - The path of keys.
 * @returns {unknown} - The value at the path, or undefined if not found.
 */
export const getValueAtPath = (obj: Record<string, unknown>, path: string[]): unknown => {
	let current = obj;

	for (let i = 0, len = path.length; i < len; i++) {
		current = current?.[path[i]] as Record<string, unknown>;

		// If the current level is undefined, exit early
		if (current === undefined) {
			return undefined;
		}
	}

	return current;
};

/**
 * Deletes a value at a specified path in a nested object.
 * @param {Record<string, unknown>} obj - The object to modify.
 * @param {string[]} path - The path of keys.
 * @returns {Record<string, unknown> | void} - The modified object, or void if invalid input.
 */
export const deleteValueAtPath = (
	obj: Record<string, unknown>,
	path: string[]
): Record<string, unknown> | void => {
	if (!obj || !path || path.length === 0) {
		// Check for valid input
		console.error('Invalid input');
		return;
	}

	let currentObj = obj;

	for (let i = 0; i < path.length - 1; i++) {
		// Traverse the object to the specified path
		//if (currentObj?.[path[i]] === undefined) {
		if (currentObj[path[i]] === undefined) {
			// If the path does not exist, return
			console.error('Path does not exist');
			return;
		}
		currentObj = currentObj[path[i]] as Record<string, unknown>;
	}

	// Delete the value at the final key in the path
	delete currentObj[path[path.length - 1]];
	return obj;
};

/**
 * Sets a value at a specified path in a nested object.
 * @param {Record<string, unknown>} obj - The object to modify.
 * @param {string[]} path - The path of keys.
 * @param {unknown} value - The value to set.
 * @param {boolean} [addPathIfNotExist=true] - Whether to create intermediate objects if they don't exist.
 * @returns {Record<string, unknown> | void} - The modified object, or void if invalid input.
 */
export const setValueAtPath = (
	obj: Record<string, unknown>,
	path: string[],
	value: unknown,
	addPathIfNotExist: boolean = true
): Record<string, unknown> | void => {
	if (!obj || !path || path.length === 0) {
		// Check for valid input
		console.error('Invalid input');
		return;
	}

	let currentObj = obj;

	for (let i = 0; i < path.length - 1; i++) {
		// Traverse the object to the specified path
		//if (currentObj?.[path[i]] === undefined) {
		if (currentObj[path[i]] === undefined) {
			if (addPathIfNotExist) {
				// If the path does not exist, add it
				currentObj[path[i]] = {};
			}
			if (!addPathIfNotExist) {
				// If the path does not exist, return
				console.error('Path does not exist');
				return;
			}
		}
		currentObj = currentObj[path[i]] as Record<string, unknown>;
	}

	// Set the value at the final key in the path
	currentObj[path[path.length - 1]] = value;
	return obj;
};
