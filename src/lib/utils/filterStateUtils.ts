/**
 * Utility functions for filter choice state management.
 */

type FilterType = 'radio' | 'checkbox' | 'toggle';

const normalizeType = (type: string): FilterType => {
	if (type === 'radio' || type === 'checkbox' || type === 'toggle') {
		return type;
	}
	return 'checkbox';
};

const normalizeToStringArray = (value: string | string[] | undefined): string[] => {
	if (Array.isArray(value)) {
		return value.filter(Boolean);
	}
	if (value) {
		return [value];
	}
	return [];
};

const areSelectionsEqual = (left: string | string[], right: string | string[]): boolean => {
	const leftArr = normalizeToStringArray(left);
	const rightArr = normalizeToStringArray(right);
	return (
		leftArr.length === rightArr.length && leftArr.every((item, index) => item === rightArr[index])
	);
};

/**
 * Synchronizes choice order between selected items and all choices.
 */
export function syncChoiceOrder(
	choisesWithId: Array<{ id: string; title: string }>,
	chosenInternal: string[]
): { chosenNew: string[]; choisesNew: string[] } {
	const chosenSet = new Set(chosenInternal ?? []);
	const chosenNew: string[] = [];
	const choisesNew: string[] = [];

	choisesWithId.forEach((choice) => {
		if (!choice.title || choisesNew.includes(choice.title)) {
			return;
		}
		if (chosenSet.has(choice.title)) {
			chosenNew.push(choice.title);
		}
		choisesNew.push(choice.title);
	});

	return { chosenNew, choisesNew };
}

/**
 * Determines button styling classes based on filter state.
 */
export function getFilterButtonClasses(
	chosen: string | string[],
	chosenDefault: string | string[],
	defaultMeansNoChange: boolean,
	_isToggle: boolean
): { btnExtraClass: string; extraInfoExtraClass: string } {
	const hasSelection = normalizeToStringArray(chosen).length > 0;
	const isDefault = areSelectionsEqual(chosenDefault, chosen);

	if ((hasSelection && !defaultMeansNoChange) || (defaultMeansNoChange && !isDefault)) {
		return {
			btnExtraClass: 'btn-primary',
			extraInfoExtraClass: 'border-primary-content text-primary-content'
		};
	}

	return {
		btnExtraClass:
			'btn-outline btn-neutral bg-primary/10 hover:bg-primary/10 hover:text-base-content',
		extraInfoExtraClass: isDefault ? 'border-base-content text-base-content' : ''
	};
}

/**
 * Gets the display title and extra info based on filter type and selection.
 */
export function getFilterDisplayInfo(
	type: string,
	chosen: string | string[],
	titlePreChange: string,
	isToggle: boolean
): { title: string; extraInfo: string } {
	const normalizedType = normalizeType(type);
	const choices = normalizeToStringArray(chosen);
	const hasSelection = choices.length > 0;

	if (isToggle || normalizedType === 'toggle') {
		return { title: hasSelection ? choices[0] : titlePreChange, extraInfo: '' };
	}

	if (normalizedType === 'radio') {
		return { title: hasSelection ? choices[0] : titlePreChange, extraInfo: '' };
	}

	if (hasSelection) {
		return { title: titlePreChange, extraInfo: `${choices.length}` };
	}

	return { title: titlePreChange, extraInfo: '' };
}

/**
 * Toggles a choice in a filter.
 */
export function toggleFilterChoice(
	type: string,
	choises: string[],
	currentChosen: string | string[] | undefined
): string | string[] | undefined {
	if (!choises?.length) {
		return undefined;
	}

	const normalizedType = normalizeType(type);
	if (normalizedType === 'radio') {
		const hasSelection = normalizeToStringArray(currentChosen).length > 0;
		return hasSelection ? undefined : choises[0];
	}

	const hasSelection = normalizeToStringArray(currentChosen).length > 0;
	return hasSelection ? undefined : [...new Set(choises)];
}

/**
 * Creates choices with IDs from plain choice array.
 */
export function createChoisesWithId(choises: string[]): Array<{ id: string; title: string }> {
	return [...new Set(choises.filter(Boolean))].map((choise) => ({
		id: choise.trim().toLowerCase().replace(/\s+/g, '-'),
		title: choise
	}));
}
