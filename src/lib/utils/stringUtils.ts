import { getPreciseType } from './typeUtils';

/**
 * Safely serializes unknown data to a string.
 * Some state objects can be circular; this fallback keeps UI rendering stable.
 */
function safeStringify(data: unknown): string {
	try {
		return JSON.stringify(data);
	} catch {
		return '[Unserializable data]';
	}
}

/**
 * Formats data into a string with a maximum length.
 * @param data - The data to format.
 * @param length - The maximum length of the resulting string.
 * @param alwaysStringyfy - Whether to always stringify the data (default: true).
 * @returns The formatted string, potentially truncated with "...".
 */
export const formatData = (
	data: unknown = '',
	length: number,
	alwaysStringyfy: boolean = true
): string => {
	if (!Number.isFinite(length) || length <= 0) {
		return '';
	}

	const string = alwaysStringyfy
		? safeStringify(data)
		: typeof data === 'string'
			? data
			: safeStringify(data);

	if (string.length <= length) {
		return string;
	}

	if (length < 5) {
		return string.substring(0, length);
	}

	const sideLength = Math.floor((length - 5) / 2);
	return `${string.substring(0, sideLength)} ... ${string.substring(string.length - sideLength)}`;
};

/**
 * Modifies a string by applying modifiers to text inside and outside of specified boundaries.
 */
export const smartModifyStringBasedOnBoundries = (
	inputString: string,
	openBoundryChar: string = '(',
	closeBoundryChar: string = ')',
	insideTextModifier: ((text: string) => string) | undefined,
	outsideTextModifier: ((text: string) => string) | undefined,
	deleteBoundriesIfTextInsideIsEmpty: boolean = true
): string => {
	if (!inputString.includes(openBoundryChar) || !inputString.includes(closeBoundryChar)) {
		return getPreciseType(outsideTextModifier) === 'function'
			? outsideTextModifier!(inputString)
			: inputString;
	}

	const result: string[] = [];
	const splitByClosed = inputString.split(closeBoundryChar);
	splitByClosed.forEach((element, index) => {
		const splitByOpen = element.split(openBoundryChar);
		let outsidePart = splitByOpen[0];
		let insidePart = splitByOpen[1];
		const shouldReAddCloseBoundary = index < splitByClosed.length - 1;

		if (outsidePart) {
			if (getPreciseType(outsideTextModifier) === 'function') {
				outsidePart = outsideTextModifier!(outsidePart);
			}
			result.push(outsidePart);
		}
		if (insidePart) {
			if (getPreciseType(insideTextModifier) === 'function') {
				insidePart = insideTextModifier!(insidePart);
			}
			if (!(deleteBoundriesIfTextInsideIsEmpty && insidePart === '')) {
				result.push(
					`${openBoundryChar}${insidePart}${shouldReAddCloseBoundary ? closeBoundryChar : ''}`
				);
			}
		}
	});

	return result.join('');
};

function replaceLastOccurrence(str: string, maxIndex: number, replacementString: string): string {
	const startIndex = str.indexOf(':{', 1);
	if (startIndex === -1) {
		return str;
	}

	const lastIndex = str.lastIndexOf(':{', maxIndex);
	if (lastIndex === -1) {
		return str;
	}

	return str.substring(0, lastIndex) + replacementString + str.substring(lastIndex + 2);
}

const replaceBetween = (input: string, start: number, end: number, replacement: string): string => {
	return input.substring(0, start) + replacement + input.substring(end);
};

function modifyString(input: string): { modifiedSubstring: string; remainingString: string } {
	const startMarker = '_QMS_ARGS_START_';
	const endMarker = '_QMS_ARGS_END_';

	const startIndex = input.indexOf(startMarker);
	const endIndex = input.indexOf(endMarker);

	if (startIndex === -1 || endIndex === -1) {
		return { modifiedSubstring: input, remainingString: '' };
	}

	const markerContent = input.substring(startIndex, endIndex + endMarker.length);
	const contentBefore = input.substring(0, startIndex);
	const contentAfter = input.substring(endIndex + endMarker.length);

	// In GraphQL, arguments precede the selection set: field(args) { selection }
	// The incoming JSON-stringified structure often looks like {"field":{"(args)":"novaluehere", "subfield":"..."}}
	// which stringifies as ... "field":{"(args)","subfield": ... } (after "QMSarguments": is removed)
	// We want to transform it to something like ... "field"(args):{"subfield": ... }
	// The generateListOfSubstrings loop then uses this to build the final query string.

	const modifiedInput = contentBefore.replace(/[:{"]+$/, '') + markerContent + ':{' + contentAfter;

	// Determine where this substring should end to be picked up by generateListOfSubstrings
	// We want to include everything up to the newly placed ':{'
	const cutIndex = contentBefore.replace(/[:{"]+$/, '').length + markerContent.length + 2;

	return {
		modifiedSubstring: modifiedInput.substring(0, cutIndex),
		remainingString: modifiedInput.substring(cutIndex)
	};
}

/**
 * Generates a list of substrings from a string, handling nested structures/parentheses.
 */
export const generateListOfSubstrings = (input: string): string[] => {
	if (!input) {
		return [];
	}

	let currentInput = input;
	const substrings: string[] = [];
	while (currentInput.length > 0) {
		const { modifiedSubstring, remainingString } = modifyString(currentInput);
		substrings.push(modifiedSubstring);
		if (remainingString === '') {
			break;
		}
		currentInput = remainingString;
	}

	return substrings.filter(Boolean);
};

/**
 * Converts a GraphQL argument object to a string representation.
 */
export const gqlArgObjToString = (gqlArgObj: Record<string, unknown>): string => {
	const gqlArgObjString = safeStringify(gqlArgObj);
	if (gqlArgObjString === '{}' || gqlArgObjString === '{ }') {
		return '';
	}

	return gqlArgObjString
		.replace(/"/g, '')
		.replace(/'/g, '"')
		.replace(/&Prime;/g, '\\"')
		.replace(/&prime;/g, `'`)
		.slice(1, -1);
};

/**
 * Generates a title string from an array of field steps.
 */
export const generateTitleFromStepsOfFields = (steps: string[]): string => {
	if (!Array.isArray(steps) || steps.length === 0) {
		return '';
	}

	return steps.filter(Boolean).join('-');
};
