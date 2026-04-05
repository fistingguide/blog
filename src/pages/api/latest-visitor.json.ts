import type { APIRoute } from "astro";
import { getVisitorState } from "../../lib/visitorState";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
	const env = (locals.runtime?.env ?? {}) as { VISITOR_STATE?: KVNamespace };
	const { latest, recent, version } = await getVisitorState(env);

	return new Response(
		JSON.stringify({
			ok: true,
			version,
			latest,
			recent,
		}),
		{
			status: 200,
			headers: {
				"content-type": "application/json; charset=utf-8",
				"cache-control": "no-store",
				"access-control-allow-origin": "*",
			},
		},
	);
};
