import type { APIRoute } from "astro";
import { getLatestVisitorState } from "../../lib/visitorState";

export const prerender = false;

export const GET: APIRoute = async () => {
	const { visitor, version, recentCountries } = getLatestVisitorState();

	return new Response(
		JSON.stringify({
			ok: true,
			version,
			visitor,
			recentCountries,
		}),
		{
			status: 200,
			headers: {
				"content-type": "application/json; charset=utf-8",
				"cache-control": "no-store",
			},
		},
	);
};
