/**
 * Migration guide from Apollo Client to Quenetiq.
 *
 * This function returns a mapping of common Apollo patterns to their Quenetiq equivalents.
 */
export function createMigrationGuide(): Record<string, string> {
	return {
		ApolloClient: 'QuenetiqClient (from @quenetiq/client)',
		InMemoryCache: 'CacheStore (from @quenetiq/cache)',
		'useQuery(query, { variables })': 'useQuery(query, { variables }) (from @quenetiq/react or @quenetiq/vue)',
		'useMutation(query, { variables, update, onCompleted, onError })':
			'useMutation(query, { variables, update, onCompleted, onError })',
		'useSubscription(query, { variables })': 'useSubscription(query, { variables })',
		'client.query({ query, variables })': 'client.query(query, variables)',
		'client.mutate({ mutation, variables })': 'client.mutate(document, variables)',
		'cache.readQuery({ query, variables })': 'cache.query(__typename, id)',
		'cache.writeQuery({ query, variables, data })': 'cache.write(entity)',
		'cache.evict({ id })': 'cache.evict(__typename, id)',
		'cache.gc()': 'cache.collectGarbage()',
		'makeVar(value)': 'makeVar(value) (from @quenetiq/core)',
		'@client directives': 'clientDirectiveMiddleware() (from @quenetiq/core)',
		ApolloProvider: 'QuenetiqProvider (from @quenetiq/react)',
		'Apollo Link': 'GraphqlMiddleware (from @quenetiq/client)',
		errorPolicy: 'Config option in QuenetiqClient / GraphqlService',
		fetchPolicy: 'Config option in QuenetiqClient / GraphqlService',
		pollInterval: 'pollInterval in useQuery options',
		optimisticResponse: 'optimistic in mutate() options',
		refetchQueries: 'client.refetch() / useQuery().refetch()',
		subscribeToMore: 'useLiveQuery() (from @quenetiq/react or @quenetiq/vue)',
		'cache.modify': 'cache.merge()',
		'field policies': 'Not yet supported (use middleware)',
		'type policies': 'Not yet supported (use middleware)',
	};
}
