import type { APIRoute } from "astro";
import { normalizeVisitorInput, pushVisitorRecord } from "../../lib/visitorState";

export const prerender = false;

const buildCorsHeaders = () => ({
	"content-type": "application/json; charset=utf-8",
	"cache-control": "no-store",
	"access-control-allow-origin": "*",
	"access-control-allow-methods": "GET,POST,OPTIONS",
	"access-control-allow-headers": "content-type",
});

const badRequest = (message: string) =>
	new Response(JSON.stringify({ ok: false, error: message }), {
		status: 400,
		headers: buildCorsHeaders(),
	});

const getFromUrl = (request: Request) => {
	const url = new URL(request.url);
	return {
		ip: url.searchParams.get("ip") ?? "",
		flag: url.searchParams.get("flag") ?? url.searchParams.get("flagIcon") ?? "",
		time: url.searchParams.get("time") ?? "",
	};
};

const getFromBody = async (request: Request) => {
	const contentType = request.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) {
		const body = (await request.json()) as Record<string, unknown>;
		return {
			ip: String(body.ip ?? ""),
			flag: String(body.flag ?? body.flagIcon ?? ""),
			time: String(body.time ?? ""),
		};
	}

	if (contentType.includes("application/x-www-form-urlencoded")) {
		const formData = await request.formData();
		return {
			ip: String(formData.get("ip") ?? ""),
			flag: String(formData.get("flag") ?? formData.get("flagIcon") ?? ""),
			time: String(formData.get("time") ?? ""),
		};
	}

	return { ip: "", flag: "", time: "" };
};

export const OPTIONS: APIRoute = async () => {
	return new Response(null, {
		status: 204,
		headers: buildCorsHeaders(),
	});
};

export const GET: APIRoute = async ({ request, locals }) => {
	const input = getFromUrl(request);
	if (!input.ip) return badRequest("Missing required parameter: ip");

	const env = (locals.runtime?.env ?? {}) as { VISITOR_STATE?: KVNamespace };
	const next = normalizeVisitorInput(input);
	const { latest, recent, version } = await pushVisitorRecord(next, env);

	return new Response(JSON.stringify({ ok: true, version, latest, recent }), {
		status: 200,
		headers: buildCorsHeaders(),
	});
};

export const POST: APIRoute = async ({ request, locals }) => {
	const input = await getFromBody(request);
	if (!input.ip) return badRequest("Missing required field: ip");

	const env = (locals.runtime?.env ?? {}) as { VISITOR_STATE?: KVNamespace };
	const next = normalizeVisitorInput(input);
	const { latest, recent, version } = await pushVisitorRecord(next, env);

	return new Response(JSON.stringify({ ok: true, version, latest, recent }), {
		status: 200,
		headers: buildCorsHeaders(),
	});
};
