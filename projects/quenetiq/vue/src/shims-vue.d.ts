declare module '*.vue' {
	import type { DefineComponent } from 'vue';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic SFC shape, matches Vue's official shim
	const component: DefineComponent<Record<string, never>, Record<string, never>, any>;
	export default component;
}
