export type VisitorSnapshot = {
	ip: string;
	countryCode: string;
	countryName: string;
	city: string;
	region: string;
	flag: string;
	updatedAt: string;
	updatedAtMs: number;
};

export type CountryVisit = {
	countryCode: string;
	countryName: string;
	flag: string;
	lastSeenAt: string;
	lastSeenAtMs: number;
};

type VisitorStateStore = {
	latest: VisitorSnapshot | null;
	version: number;
	recentCountries: CountryVisit[];
};

const STATE_KEY = "__latest_visitor_state__";

const toFlag = (code: string): string => {
	if (!/^[A-Z]{2}$/.test(code)) return "\u{1F3F3}\uFE0F";
	return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
};

const normalizeIp = (raw: string): string => {
	return raw.split(",")[0]?.trim() || "Unknown";
};

const getStore = (): VisitorStateStore => {
	const globalState = globalThis as Record<string, unknown>;
	if (!globalState[STATE_KEY]) {
		globalState[STATE_KEY] = {
			latest: null,
			version: 0,
			recentCountries: [],
		} satisfies VisitorStateStore;
	}
	return globalState[STATE_KEY] as VisitorStateStore;
};

const updateRecentCountries = (store: VisitorStateStore, visitor: VisitorSnapshot): CountryVisit[] => {
	const key = visitor.countryCode || visitor.countryName || "Unknown";
	const filtered = store.recentCountries.filter((item) => {
		const itemKey = item.countryCode || item.countryName || "Unknown";
		return itemKey !== key;
	});

	const nextItem: CountryVisit = {
		countryCode: visitor.countryCode,
		countryName: visitor.countryName,
		flag: visitor.flag,
		lastSeenAt: visitor.updatedAt,
		lastSeenAtMs: visitor.updatedAtMs,
	};

	store.recentCountries = [nextItem, ...filtered].slice(0, 5);
	return store.recentCountries;
};

export const buildVisitorFromRequest = (request: Request, clientAddress?: string): VisitorSnapshot => {
	const req = request as Request & { cf?: Record<string, unknown> };
	const cf = req.cf ?? {};

	const rawIp =
		request.headers.get("cf-connecting-ip") ??
		request.headers.get("x-forwarded-for") ??
		clientAddress ??
		"Unknown";

	const countryCode =
		typeof cf.country === "string" && cf.country.length === 2 ? cf.country.toUpperCase() : "";

	const now = Date.now();

	return {
		ip: normalizeIp(rawIp),
		countryCode,
		countryName: (cf.countryName as string) ?? countryCode ?? "Unknown Country",
		city: (cf.city as string) ?? "Unknown City",
		region: (cf.region as string) ?? "Unknown Region",
		flag: toFlag(countryCode),
		updatedAt: new Date(now).toLocaleString("zh-CN", { hour12: false }),
		updatedAtMs: now,
	};
};

export const upsertLatestVisitor = (
	nextVisitor: VisitorSnapshot,
): { visitor: VisitorSnapshot; version: number; changed: boolean; recentCountries: CountryVisit[] } => {
	const store = getStore();
	const changed = !store.latest || store.latest.ip !== nextVisitor.ip;

	if (changed) {
		store.latest = nextVisitor;
		store.version += 1;
		updateRecentCountries(store, nextVisitor);
	}

	return {
		visitor: store.latest ?? nextVisitor,
		version: store.version,
		changed,
		recentCountries: store.recentCountries,
	};
};

export const getLatestVisitorState = (): {
	visitor: VisitorSnapshot | null;
	version: number;
	recentCountries: CountryVisit[];
} => {
	const store = getStore();
	return { visitor: store.latest, version: store.version, recentCountries: store.recentCountries };
};
