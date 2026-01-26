import {
	generate_finalGqlArgObjAndCanRunQuery,
	generate_finalGqlArgObj_fromGroups,
	generate_group_gqlArgObjAndCanRunQuery_forHasOperators,
	generate_group_gqlArgObj
} from '$lib/utils/usefulFunctions';
import { writable, get } from 'svelte/store';

export const Create_finalGqlArgObj_Store = (
	_activeArgumentsDataGrouped_Store: any,
	_paginationState_Store: any
) => {
	//rewrite,make it so that it always regenerates al groups when running without needing 'group'.
	const store = writable<Record<string, any>>({});
	const { subscribe, set, update } = store;

	return {
		subscribe,
		set,
		update,
		regenerate_groupsAndfinalGqlArgObj: () => {
			const activeArgumentsDataGrouped = get(_activeArgumentsDataGrouped_Store);
			const finalGqlArgObjAndCanRunQuery = generate_finalGqlArgObjAndCanRunQuery(
				activeArgumentsDataGrouped as any,
				_paginationState_Store,
				true
			);
			if (finalGqlArgObjAndCanRunQuery.final_canRunQuery) {
				set(finalGqlArgObjAndCanRunQuery);
			} else {
			}
		}
	};
};
