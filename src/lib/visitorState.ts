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

export const pushVisitorRecord = (next: VisitorRecord): { latest: VisitorRecord; recent: VisitorRecord[]; version: number } => {
	const store = getStore();
	store.latest = next;
	store.version += 1;

	const withoutSame = store.recent.filter((item) => !(item.ip === next.ip && item.time === next.time && item.flag === next.flag));
	store.recent = [next, ...withoutSame].slice(0, 5);

	return {
		latest: store.latest,
		recent: store.recent,
		version: store.version,
	};
};

export const getVisitorState = (): { latest: VisitorRecord | null; recent: VisitorRecord[]; version: number } => {
	const store = getStore();
	return { latest: store.latest, recent: store.recent, version: store.version };
};
