import { persisted } from 'svelte-persisted-store';
import { get } from 'svelte/store';

export interface ProxySettings {
	enabled: boolean;
	proxyUrl: string;
}

export const proxySettings = persisted<ProxySettings>('proxySettings', {
	enabled: false,
	proxyUrl: '/api/proxy'
});

export const getProxiedUrl = (targetUrl: string): string => {
	const s = get(proxySettings);
	if (!s.enabled || !s.proxyUrl) return targetUrl;
	return `${s.proxyUrl.replace(/\/$/, '')}?target=${encodeURIComponent(targetUrl)}`;
};
