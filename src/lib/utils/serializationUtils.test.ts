import { describe, it, expect } from 'vitest';
import { typeToSchemaJson } from './serializationUtils';

describe('typeToSchemaJson', () => {
	it('returns valid JSON string', () => {
		const result = typeToSchemaJson({ name: 'User', kind: 'OBJECT' });
		expect(() => JSON.parse(result)).not.toThrow();
	});

	it('strips dd_ prefixed keys', () => {
		const type = {
			name: 'User',
			kind: 'OBJECT',
			dd_displayName: 'User',
			dd_rootName: 'User',
			dd_kindsArray: ['OBJECT'],
			dd_NON_NULL: false
		};
		const parsed = JSON.parse(typeToSchemaJson(type));
		expect(parsed.name).toBe('User');
		expect(parsed.kind).toBe('OBJECT');
		expect(parsed.dd_displayName).toBeUndefined();
		expect(parsed.dd_rootName).toBeUndefined();
		expect(parsed.dd_kindsArray).toBeUndefined();
		expect(parsed.dd_NON_NULL).toBeUndefined();
	});

	it('preserves non-dd_ nested fields', () => {
		const type = {
			name: 'Query',
			kind: 'OBJECT',
			fields: [
				{ name: 'user', description: 'Fetch a user', dd_rootName: 'User' }
			]
		};
		const parsed = JSON.parse(typeToSchemaJson(type));
		expect(parsed.fields).toHaveLength(1);
		expect(parsed.fields[0].name).toBe('user');
		expect(parsed.fields[0].description).toBe('Fetch a user');
		expect(parsed.fields[0].dd_rootName).toBeUndefined();
	});

	it('replaces circular references with "[Circular]"', () => {
		const typeA: any = { name: 'A', kind: 'OBJECT' };
		const typeB: any = { name: 'B', kind: 'OBJECT', relatedTo: typeA };
		typeA.relatedTo = typeB;

		const result = typeToSchemaJson(typeA);
		const parsed = JSON.parse(result);
		expect(parsed.name).toBe('A');
		expect(parsed.relatedTo.name).toBe('B');
		expect(parsed.relatedTo.relatedTo).toBe('[Circular]');
	});

	it('handles null fields gracefully', () => {
		const type = { name: 'Foo', kind: 'SCALAR', description: null, fields: null };
		const parsed = JSON.parse(typeToSchemaJson(type));
		expect(parsed.name).toBe('Foo');
		expect(parsed.description).toBeNull();
		expect(parsed.fields).toBeNull();
	});

	it('handles arrays of types without dd_ fields', () => {
		const types = [
			{ name: 'Query', kind: 'OBJECT', dd_displayName: 'Query' },
			{ name: 'User', kind: 'OBJECT', dd_displayName: 'User' }
		];
		const parsed = JSON.parse(typeToSchemaJson(types));
		expect(parsed).toHaveLength(2);
		expect(parsed[0].dd_displayName).toBeUndefined();
		expect(parsed[1].dd_displayName).toBeUndefined();
	});

	it('returns pretty-printed JSON with 2-space indent', () => {
		const result = typeToSchemaJson({ name: 'Test' });
		expect(result).toContain('\n');
		expect(result).toContain('  ');
	});

	it('handles deeply nested objects with circular reference at depth', () => {
		const root: any = { name: 'Root', kind: 'OBJECT' };
		const child: any = { name: 'Child', parent: root };
		root.child = child;

		const parsed = JSON.parse(typeToSchemaJson(root));
		expect(parsed.child.name).toBe('Child');
		expect(parsed.child.parent).toBe('[Circular]');
	});

	it('handles enum type with enumValues', () => {
		const enumType = {
			name: 'Status',
			kind: 'ENUM',
			dd_kindsArray: ['ENUM'],
			enumValues: [
				{ name: 'ACTIVE', isDeprecated: false, dd_displayName: 'ACTIVE' },
				{ name: 'INACTIVE', isDeprecated: false, dd_displayName: 'INACTIVE' }
			]
		};
		const parsed = JSON.parse(typeToSchemaJson(enumType));
		expect(parsed.kind).toBe('ENUM');
		expect(parsed.enumValues).toHaveLength(2);
		expect(parsed.enumValues[0].name).toBe('ACTIVE');
		expect(parsed.enumValues[0].dd_displayName).toBeUndefined();
	});
});
