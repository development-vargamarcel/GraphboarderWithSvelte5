import { describe, it, expect, vi } from 'vitest';
import {
	add_activeArgumentOrContainerTo_activeArgumentsDataGrouped,
	Create_activeArgumentsDataGrouped_Store
} from './activeArgumentsDataGrouped_Store';
import { get } from 'svelte/store';
import type { ActiveArgumentGroup } from '$lib/types';

describe('add_activeArgumentOrContainerTo_activeArgumentsDataGrouped - nested paths', () => {
	it('should automatically create intermediate containers for deep paths', () => {
		const rootTypes = [
			{ name: 'WhereInput', inputFields: [{ dd_displayName: 'user', dd_rootName: 'UserInput' }] },
			{ name: 'UserInput', inputFields: [{ dd_displayName: 'id', dd_rootName: 'ID' }] }
		];
		const mockSchemaData = {
			subscribe: vi.fn((fn) => {
				fn({ rootTypes });
				return () => {};
			}),
			get_rootType: vi.fn((rt: any, name: string) => {
				return rootTypes.find(t => t.name === name);
			}),
			get_QMS_Field: vi.fn(() => null)
		} as any;

		const mockEndpointInfo = {
			get_typeExtraData: vi.fn(() => null)
		} as any;

		const activeArgumentsDataGrouped: any[] = [
			{
				group_name: 'where',
				group_args: [],
				group_argsNode: {
					mainContainer: {
						id: 'mainContainer',
						dd_displayName: 'where',
						dd_rootName: 'WhereInput',
						items: [],
						stepsOfFields: ['where'],
						stepsOfFieldsStringified: JSON.stringify(['where'])
					}
				}
			}
		];

		const newArg = {
			id: 'new-id',
			dd_displayName: 'id',
			dd_rootName: 'ID',
			stepsOfFields: ['where', 'user', 'id'],
			stepsOfFieldsStringified: JSON.stringify(['where', 'user', 'id']),
			inUse: true,
			operator: undefined
		};

		add_activeArgumentOrContainerTo_activeArgumentsDataGrouped(
			newArg as any,
			'where',
			null,
			activeArgumentsDataGrouped,
			mockEndpointInfo,
			undefined, // group
			mockSchemaData
		);

		const group = activeArgumentsDataGrouped[0];

		// Should have created one intermediate container for 'user'
		expect(Object.keys(group.group_argsNode).length).toBe(3); // mainContainer, user-container, new-id

		const main = group.group_argsNode.mainContainer;
		expect(main.items.length).toBe(1);

		const intermediateId = main.items[0].id;
		const intermediateNode = group.group_argsNode[intermediateId];
		expect(intermediateNode.dd_displayName).toBe('user');
		expect(intermediateNode.stepsOfFieldsStringified).toBe(JSON.stringify(['where', 'user']));
		expect(intermediateNode.items.some((it: any) => it.id === 'new-id')).toBe(true);
	});

	it('should handle multi-level nested paths', () => {
		const rootTypes = [
			{ name: 'WhereInput', inputFields: [{ dd_displayName: 'user', dd_rootName: 'UserInput' }] },
			{ name: 'UserInput', inputFields: [{ dd_displayName: 'profile', dd_rootName: 'ProfileInput' }] },
			{ name: 'ProfileInput', inputFields: [{ dd_displayName: 'email', dd_rootName: 'String' }] }
		];
		const mockSchemaData = {
			subscribe: vi.fn((fn) => {
				fn({ rootTypes });
				return () => {};
			}),
			get_rootType: vi.fn((rt: any, name: string) => {
				return rootTypes.find(t => t.name === name);
			})
		} as any;

		const activeArgumentsDataGrouped: any[] = [
			{
				group_name: 'where',
				group_args: [],
				group_argsNode: {
					mainContainer: {
						id: 'mainContainer',
						dd_displayName: 'where',
						dd_rootName: 'WhereInput',
						items: [],
						stepsOfFields: ['where'],
						stepsOfFieldsStringified: JSON.stringify(['where'])
					}
				}
			}
		];

		const deepArg = {
			id: 'email-id',
			dd_displayName: 'email',
			dd_rootName: 'String',
			stepsOfFields: ['where', 'user', 'profile', 'email'],
			stepsOfFieldsStringified: JSON.stringify(['where', 'user', 'profile', 'email']),
			inUse: true
		};

		const mockEndpointInfo = {
			get_typeExtraData: vi.fn(() => null)
		} as any;

		add_activeArgumentOrContainerTo_activeArgumentsDataGrouped(
			deepArg as any,
			'where',
			null,
			activeArgumentsDataGrouped,
			mockEndpointInfo,
			undefined,
			mockSchemaData
		);

		const group = activeArgumentsDataGrouped[0];

		// mainContainer -> user -> profile -> email
		expect(Object.keys(group.group_argsNode).length).toBe(4);

		const main = group.group_argsNode.mainContainer;
		const userId = main.items[0].id;
		const userNode = group.group_argsNode[userId];
		expect(userNode.dd_displayName).toBe('user');

		const profileId = userNode.items[0].id;
		const profileNode = group.group_argsNode[profileId];
		expect(profileNode.dd_displayName).toBe('profile');
		expect(profileNode.items.some((it: any) => it.id === 'email-id')).toBe(true);
	});

	it('should add argument to an existing nested container', () => {
		const rootTypes = [
			{ name: 'WhereInput', inputFields: [{ dd_displayName: 'user', dd_rootName: 'UserInput' }] },
			{ name: 'UserInput', inputFields: [{ dd_displayName: 'id', dd_rootName: 'ID' }, { dd_displayName: 'name', dd_rootName: 'String' }] }
		];
		const mockSchemaData = {
			subscribe: (fn: any) => { fn({ rootTypes }); return () => {}; },
			get_rootType: (rt: any, name: string) => rootTypes.find(t => t.name === name)
		} as any;

		const activeArgumentsDataGrouped: any[] = [
			{
				group_name: 'where',
				group_args: [],
				group_argsNode: {
					mainContainer: {
						id: 'mainContainer',
						dd_displayName: 'where',
						dd_rootName: 'WhereInput',
						items: [{ id: 'user-id' }],
						stepsOfFields: ['where'],
						stepsOfFieldsStringified: JSON.stringify(['where'])
					},
					'user-id': {
						id: 'user-id',
						dd_displayName: 'user',
						dd_rootName: 'UserInput',
						items: [],
						stepsOfFields: ['where', 'user'],
						stepsOfFieldsStringified: JSON.stringify(['where', 'user'])
					}
				}
			}
		];

		const newArg = {
			id: 'name-id',
			dd_displayName: 'name',
			stepsOfFields: ['where', 'user', 'name'],
			stepsOfFieldsStringified: JSON.stringify(['where', 'user', 'name']),
		};

		add_activeArgumentOrContainerTo_activeArgumentsDataGrouped(
			newArg as any,
			'where',
			null,
			activeArgumentsDataGrouped,
			{ get_typeExtraData: () => null } as any,
			undefined,
			mockSchemaData
		);

		const group = activeArgumentsDataGrouped[0];
		expect(group.group_argsNode['user-id'].items.some((it: any) => it.id === 'name-id')).toBe(true);
	});

	it('should handle adding a container deeply nested', () => {
		const rootTypes = [
			{ name: 'Query', inputFields: [{ dd_displayName: 'user', dd_rootName: 'UserInput' }] },
			{ name: 'WhereInput', inputFields: [{ dd_displayName: 'user', dd_rootName: 'UserInput' }] },
			{ name: 'UserInput', inputFields: [{ dd_displayName: 'profile', dd_rootName: 'ProfileInput' }] }
		];
		const mockSchemaData = {
			subscribe: (fn: any) => { fn({ rootTypes }); return () => {}; },
			get_rootType: (rt: any, name: string) => rootTypes.find(t => t.name === name)
		} as any;

		const activeArgumentsDataGrouped: any[] = [
			{
				group_name: 'all',
				group_args: [],
				group_argsNode: {
					mainContainer: {
						id: 'mainContainer',
						dd_displayName: 'all',
						dd_rootName: 'Query',
						items: [],
						stepsOfFields: ['all'],
						stepsOfFieldsStringified: JSON.stringify(['all'])
					}
				}
			}
		];

		const newContainer = {
			id: 'profile-container-id',
			dd_displayName: 'profile',
			dd_rootName: 'ProfileInput',
			items: [],
			stepsOfFields: ['all', 'user', 'profile'],
			stepsOfFieldsStringified: JSON.stringify(['all', 'user', 'profile']),
			operator: 'bonded',
			not: false
		};

		add_activeArgumentOrContainerTo_activeArgumentsDataGrouped(
			newContainer as any,
			'all',
			null,
			activeArgumentsDataGrouped,
			{ get_typeExtraData: () => null } as any,
			undefined,
			mockSchemaData
		);

		const group = activeArgumentsDataGrouped[0];
		// mainContainer -> user (created) -> profile (added)
		expect(Object.keys(group.group_argsNode).length).toBe(3);

		const main = group.group_argsNode.mainContainer;
		const userId = main.items[0].id;
		const userNode = group.group_argsNode[userId];
		expect(userNode.dd_displayName).toBe('user');
		expect(userNode.items[0].id).toBe('profile-container-id');
	});

	it('should handle deletion of nested items', () => {
		const store = Create_activeArgumentsDataGrouped_Store([], true, {} as any);
		const group: ActiveArgumentGroup = {
			group_name: 'where',
			group_args: [{ id: 'child-id', stepsOfFieldsStringified: '[]' } as any],
			group_argsNode: {
				mainContainer: {
					id: 'mainContainer',
					items: [{ id: 'child-id' }]
				} as any,
				'child-id': {
					id: 'child-id',
					stepsOfFieldsStringified: '[]'
				} as any
			},
			originType: {} as any,
			group_isRoot: false,
			dd_kindsArray: [],
			dd_namesArray: [],
			dd_rootName: 'Where'
		} as any;

		store.set([group]);

		store.delete_activeArgument({ id: 'child-id' } as any, 'where');

		const updatedGroups = get(store);
		const updatedGroup = updatedGroups[0];

		expect(updatedGroup.group_args).toHaveLength(0);
		expect(updatedGroup.group_argsNode?.['child-id']).toBeUndefined();
		expect(updatedGroup.group_argsNode?.mainContainer.items).toHaveLength(0);
	});
});
