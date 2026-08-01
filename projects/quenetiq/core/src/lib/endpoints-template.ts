export function generateEndpointsYamlTemplate(): string {
	return `# Quenetiq Endpoints Configuration
# Define multiple GraphQL endpoints and reference them by name.

default_endpoint: main

endpoints:
  main:
    url: http://localhost:4000/graphql
    headers:
      Authorization: "Bearer \${TOKEN}"
    errorPolicy: none
    retryCount: 3
    retryDelay: 1000
    fallbackTo: standby
    healthCheck: /health

  users:
    url: http://localhost:4001/graphql
    errorPolicy: all

  payments:
    url: http://localhost:4002/graphql
    errorPolicy: none
    retryCount: 0
    retryDelay: 0

  standby:
    url: http://localhost:4003/graphql
    errorPolicy: all

groups:
  core:
    - main
    - users
  financial:
    - payments
`;
}
