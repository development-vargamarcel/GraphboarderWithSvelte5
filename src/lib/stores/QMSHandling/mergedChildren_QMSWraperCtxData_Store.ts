import { get, writable } from 'svelte/store';
const getObjIndexInArray = (
	arr: any[] = [],
	obj: Record<string, any> = {},
	identifierKey = 'stepsOfFields'
) => {
	const objIdentifierKeyValue_string = JSON.stringify(obj[identifierKey]);
	return arr.findIndex((currObj) => {
		return JSON.stringify(currObj[identifierKey]) == objIdentifierKeyValue_string;
	});
};
export const Create_mergedChildren_QMSWraperCtxData_Store = (initialValue: any[] = []) => {
	const store = writable(initialValue);
	const { subscribe, set, update } = store;
	return {
		...store,
		addOrReplace: (obj: any) => {
			const storeVal = get(store);
			const objIndexInArray = getObjIndexInArray(storeVal, obj, 'stepsOfFields');
			const objIsPresentInArray = objIndexInArray > -1;
			if (objIsPresentInArray) {
				storeVal[objIndexInArray] = obj;
			} else {
				storeVal.push(obj);
			}
			store.set(storeVal);
		},
		getObj: (stepsOfFields: string[]) => {
			const storeVal = get(store);
			const objIndexInArray = getObjIndexInArray(storeVal, { stepsOfFields }, 'stepsOfFields');
			// const objIsPresentInArray = objIndexInArray > -1; // Unused
			return storeVal[objIndexInArray];
		}
	};
};
