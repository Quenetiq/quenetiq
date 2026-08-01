export interface DocMeta {
	title: string;
	slug: string;
	group: string;
	order: number;
	since: string;
	tags: string[];
	description: string;
	github?: string;
	package?: string;
	children?: DocMeta[];
}

export interface SidebarGroup {
	label: string;
	order: number;
	items: DocMeta[];
}
