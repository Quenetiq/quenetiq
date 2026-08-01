export { GraphqlDebugService, type GraphqlDebugEntry } from './lib/graphql-debug.service';
export {
	parseFieldTree,
	buildMutationChart,
	normalizeData,
	groupEntities,
	type InspectedField,
	type MutationChartPoint,
	type NormalizedEntity,
} from './lib/deep-inspection';

// DevTools Panel
export {
	provideDevToolsPanel,
	DevToolsService,
	DevToolsPanelComponent,
	type DevToolsTab,
	type CacheSnapshot,
} from './lib/devtools-panel/index';
