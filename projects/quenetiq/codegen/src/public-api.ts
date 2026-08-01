export { generateSchemaTypes, generateSchemaFile } from './lib/schema-types';
export type { SchemaData, SchemaType, CodegenScalars } from './lib/schema-types';

export {
	findGraphqlFiles,
	parseGraphqlFile,
	generateTypedDocumentsCode,
	generateIndexCode,
} from './lib/graphql-file-parser';
export type {
	ParsedOperation,
	OperationVar,
	DocumentCodegenOptions,
	FragmentTypeInfo,
} from './lib/graphql-file-parser';

export { mergeGeneratedTypes } from './lib/schema-merge';

export { parseFragmentFile, generateFragmentCode, generateFragmentIndex } from './lib/fragment-parser';
export type { ParsedFragment } from './lib/fragment-parser';
