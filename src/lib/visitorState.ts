export type VisitorRecord = {
	ip: string;
	flag: string;
	time: string;
	timeMs: number;
};

type VisitorStateStore = {
	latest: VisitorRecord | null;
	version: number;
	recent: VisitorRecord[];
};

const STATE_KEY = "__api_visitor_state__";
const KV_KEY = "visitor_state_v1";

type VisitorEnv = {
	VISITOR_STATE?: KVNamespace;
};

const getStore = (): VisitorStateStore => {
	const globalState = globalThis as Record<string, unknown>;
	if (!globalState[STATE_KEY]) {
		globalState[STATE_KEY] = {
			latest: null,
			version: 0,
			recent: [],
		} satisfies VisitorStateStore;
	}
	return globalState[STATE_KEY] as VisitorStateStore;
};

const readFromKv = async (env?: VisitorEnv): Promise<VisitorStateStore | null> => {
	const kv = env?.VISITOR_STATE;
	if (!kv) return null;

	const value = await kv.get<VisitorStateStore>(KV_KEY, "json");
	if (!value) return { latest: null, version: 0, recent: [] };

	return {
		latest: value.latest ?? null,
		version: Number(value.version ?? 0),
		recent: Array.isArray(value.recent) ? value.recent : [],
	};
};

const writeToKv = async (env: VisitorEnv | undefined, state: VisitorStateStore): Promise<void> => {
	const kv = env?.VISITOR_STATE;
	if (!kv) return;
	await kv.put(KV_KEY, JSON.stringify(state));
};

const parseTimeToMs = (value: string): number => {
	const asNumber = Number(value);
	if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
	const asDate = Date.parse(value);
	if (Number.isNaN(asDate)) return Date.now();
	return asDate;
};

export const normalizeVisitorInput = (input: {
	ip?: string;
	flag?: string;
	time?: string;
}): VisitorRecord => {
	const ip = (input.ip ?? "").trim() || "Unknown";
	const flag = (input.flag ?? "").trim() || "\u{1F3F3}\uFE0F";
	const rawTime = (input.time ?? "").trim();

	if (rawTime) {
		return {
			ip,
			flag,
			time: rawTime,
			timeMs: parseTimeToMs(rawTime),
		};
	}

	const now = Date.now();
	return {
		ip,
		flag,
		time: new Date(now).toLocaleString("zh-CN", { hour12: false }),
		timeMs: now,
	};
};

export const pushVisitorRecord = async (
	next: VisitorRecord,
	env?: VisitorEnv,
): Promise<{ latest: VisitorRecord; recent: VisitorRecord[]; version: number }> => {
	const store = (await readFromKv(env)) ?? getStore();

	store.latest = next;
	store.version += 1;
	const withoutSame = store.recent.filter((item) => !(item.ip === next.ip && item.time === next.time && item.flag === next.flag));
	store.recent = [next, ...withoutSame].slice(0, 5);

	await writeToKv(env, store);

	return {
		latest: store.latest,
		recent: store.recent,
		version: store.version,
	};
};

export const getVisitorState = async (
	env?: VisitorEnv,
): Promise<{ latest: VisitorRecord | null; recent: VisitorRecord[]; version: number }> => {
	const store = (await readFromKv(env)) ?? getStore();
	return { latest: store.latest, recent: store.recent, version: store.version };
};
