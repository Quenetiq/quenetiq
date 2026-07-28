export type Resolvers = Record<string, Record<string, (parent: any, args: any, context: any, info: any) => any>>;

export interface MockConfig {
	schema?: string;
	resolvers?: Resolvers;
	/** Watch schema files for changes and hot-reload. Notifies connected clients via WebSocket at /schema-ws. */
	watchSchema?: boolean;
}

export interface ProxyConfig {
	target: string;
	/** Force-enable URL rewriting (localhost → public host) in proxied responses */
	rewrite?: boolean;
}

export interface SpawnConfig {
	cmd: string;
	cwd?: string;
}

export interface DevServerConfig {
	mock?: MockConfig;
	proxy?: ProxyConfig;
	port?: number;
	spawn?: SpawnConfig;
	/** Directory to serve static files from (overrides proxy when set) */
	staticDir?: string;
}
