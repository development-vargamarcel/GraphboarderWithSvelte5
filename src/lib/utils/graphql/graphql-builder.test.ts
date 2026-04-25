import { describe, it, expect } from 'vitest';
import { build_QMS_bodyPart } from './graphql-builder';

describe('build_QMS_bodyPart', () => {
	it('should include arguments in the generated query', () => {
		const QMS_name = 'user';
		const QMS_fields = { user: { id: 'novaluehere', name: 'novaluehere' } };
		const QMS_args = { id: 1 };
		const mergedChildren_finalGqlArgObj = {};

		const result = build_QMS_bodyPart(
			QMS_name,
			QMS_fields,
			QMS_args,
			'query',
			mergedChildren_finalGqlArgObj
		);

		console.log('Result:', result);
		expect(result).toContain('(id:1)');
		expect(result).toContain('user');
		expect(result).toContain('id');
		expect(result).toContain('name');
	});

    it('should handle nested arguments', () => {
		const QMS_name = 'users';
		const QMS_fields = { users: { id: 'novaluehere' } };
		const QMS_args = { where: { id: { _eq: 1 } } };
		const mergedChildren_finalGqlArgObj = {};

		const result = build_QMS_bodyPart(
			QMS_name,
			QMS_fields,
			QMS_args,
			'query',
			mergedChildren_finalGqlArgObj
		);

		console.log('Result nested:', result);
		expect(result).toContain('(where:{id:{_eq:1}})');
	});

	// Regression: when a child field arg comes in via mergedChildren_finalGqlArgObj
	// and that same field is a selected scalar in QMS_fields (sentinel 'novaluehere'),
	// the args used to be lost because the lodash merge applied QMS_fields last and
	// the string sentinel overwrote the {QMSarguments: ...} object.
	it('should attach child-field arguments coming from mergedChildren_finalGqlArgObj', () => {
		const result = build_QMS_bodyPart(
			'items',
			{ items: { id: 'novaluehere', name: 'novaluehere' } },
			{},
			'query',
			{ items: { name: { QMSarguments: { uppercase: true } } } }
		);
		expect(result).toContain('uppercase:true');
		expect(result).toContain('name(uppercase:true)');
	});
});
