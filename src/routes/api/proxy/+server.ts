import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
	const targetUrl = url.searchParams.get('target');
	if (!targetUrl) {
		return new Response(JSON.stringify({ error: 'Missing target URL' }), {
			status: 400,
			headers: { 'content-type': 'application/json' }
		});
	}

	const skip = new Set([
		'host',
		'connection',
		'transfer-encoding',
		'te',
		'trailer',
		'upgrade',
		'origin'
	]);
	const forwardHeaders: Record<string, string> = {};
	request.headers.forEach((value, key) => {
		if (!skip.has(key.toLowerCase())) forwardHeaders[key] = value;
	});

	const body = await request.arrayBuffer();
	const upstream = await fetch(targetUrl, { method: 'POST', headers: forwardHeaders, body });
	const responseBody = await upstream.arrayBuffer();

	return new Response(responseBody, {
		status: upstream.status,
		headers: {
			'content-type': upstream.headers.get('content-type') ?? 'application/json',
			'access-control-allow-origin': '*'
		}
	});
};

export const OPTIONS: RequestHandler = async () =>
	new Response(null, {
		headers: {
			'access-control-allow-origin': '*',
			'access-control-allow-methods': 'POST, OPTIONS',
			'access-control-allow-headers': '*'
		}
	});
