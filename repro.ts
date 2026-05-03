import _ from 'lodash';

// Minimal implementation of needed functions
const filterElFromArr = (arr: any[], undesiredElements: any[] = []) => {
	return arr.filter((el) => !undesiredElements.includes(el));
};

const setValueAtPath = (obj: any, path: string[], value: any, addPathIfNotExist: boolean = true) => {
	if (!obj || !path || path.length === 0) return undefined;
	let currentObj = obj;
	for (let i = 0; i < path.length - 1; i++) {
		if (currentObj[path[i]] === undefined) {
			if (addPathIfNotExist) currentObj[path[i]] = {};
			else return undefined;
		}
		currentObj = currentObj[path[i]];
	}
	currentObj[path[path.length - 1]] = value;
	return obj;
};

const validItems = (items: any[], nodes: any): any[] => {
	return items.filter((item) => {
		const itemData = nodes[item.id];
		const isContainer = Object.prototype.hasOwnProperty.call(itemData, 'items');
		return (
			itemData.inUse ||
			(isContainer && validItems(itemData.items, nodes).length > 0) ||
			itemData.selectedRowsColValues
		);
	});
};

const generate_group_gqlArgObj_forHasOperators = (
	items: any[],
	group_name: string,
	nodes: any
): any => {
	let resultingGqlArgObj: any = {};
	const itemsResultingData: any[] = [];

	items.forEach((item) => {
		const itemData = nodes[item.id];
		const isContainer = Object.prototype.hasOwnProperty.call(itemData, 'items');
		const nodeStep = itemData?.stepsOfNodes?.[itemData?.stepsOfNodes.length - 1];
		const nodeStepClean = nodeStep
			? filterElFromArr(nodeStep, [null, undefined, 'bonded', 'list'])
			: [];

		const operator = itemData.operator;
		let itemObj: any = {};
		let itemObjCurr: any = itemObj;
		const displayName = itemData?.dd_displayName;
		let dataToAssign;

		if (isContainer) {
			const validItemsResult = validItems(itemData.items, nodes);
			const gqlArgObjForItems = generate_group_gqlArgObj_forHasOperators(
				validItemsResult,
				group_name,
				nodes
			).itemsResultingData;
			if (operator == 'bonded' || !itemData?.dd_kindList) {
				const merged_gqlArgObjForItems = _.merge({}, ...gqlArgObjForItems);
				dataToAssign = merged_gqlArgObjForItems;
			} else {
				dataToAssign = gqlArgObjForItems;
			}
		} else {
			dataToAssign = nodes[item.id]?.gqlArgObj;
		}

		const resultingGqlArgObjForItem = setValueAtPath(
			{},
			nodeStepClean as string[],
			dataToAssign,
			true
		);

		if (resultingGqlArgObjForItem == undefined) {
			_.merge(resultingGqlArgObj, dataToAssign);
		} else {
			_.merge(resultingGqlArgObj, resultingGqlArgObjForItem);
		}

		if (isContainer) {
			if (itemData.not) {
				itemObjCurr['_not'] = displayName ? {} : dataToAssign;
				itemObjCurr = itemObjCurr['_not'];
			}
			if (displayName) {
				itemObjCurr[displayName] = dataToAssign;
				itemObjCurr = itemObjCurr[displayName];
			} else {
				itemObjCurr = _.merge(itemObjCurr, dataToAssign);
			}
		}

		if (!isContainer && displayName) {
			if (itemData.not) {
				itemObjCurr['_not'] = dataToAssign;
				itemObjCurr = itemObjCurr['_not'];
			} else {
				itemObj = dataToAssign as any;
			}
		}

		itemsResultingData.push(itemObj);
	});
	return {
		resultingGqlArgObj,
		itemsResultingData
	};
};

// Test Case
const nodes = {
	mainContainer: {
		id: 'mainContainer',
		isMain: true,
		dd_displayName: 'users',
		operator: 'bonded',
		items: [{ id: 'where' }],
		stepsOfNodes: [[undefined, 'users', 'bonded']]
	},
	where: {
		id: 'where',
		dd_displayName: 'where',
		operator: 'bonded',
		items: [{ id: 'id' }],
		stepsOfNodes: [
			[undefined, 'users', 'bonded'],
			[undefined, 'where', 'bonded']
		]
	},
	id: {
		id: 'id',
		dd_displayName: 'id',
		inUse: true,
		gqlArgObj: { id: { _eq: 1 } }, // This is what generate_gqlArgObj produces
		stepsOfNodes: [
			[undefined, 'users', 'bonded'],
			[undefined, 'where', 'bonded'],
			[undefined, 'id', 'bonded']
		]
	}
};

const result = generate_group_gqlArgObj_forHasOperators(
	[nodes.mainContainer],
	'all',
	nodes
);

console.log('Final resultingGqlArgObj:');
console.log(JSON.stringify(result.resultingGqlArgObj, null, 2));
