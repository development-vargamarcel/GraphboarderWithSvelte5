import { derived } from 'svelte/store';

export const Create_QMS_bodyPartsUnifier_StoreDerived = (
	_QMS_bodyPart_StoreDerived_array: any[],
	QMS_type = 'query',
	QMS_name = 'QMS_name'
) => {
	return derived(_QMS_bodyPart_StoreDerived_array, ($stores: any[]) => {
		const storesReduced = $stores.reduce((prevVal: string, currVal: string) => {
			if (!currVal) {
				return '';
			}
			return prevVal + currVal;
		}, '');

		if (!storesReduced) {
			return '';
		}
		const QMS_body = `${QMS_type}-${QMS_name}{
            ${storesReduced}
        }`;
		const QMS_bodyProcessed = QMS_body.replace('-', ' ');
		//return QMS_body.replaceAll(/\s/g, '').replace('-', ' ');

		return QMS_bodyProcessed;
	});
};
