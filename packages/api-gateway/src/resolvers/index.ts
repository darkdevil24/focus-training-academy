/**
 * GraphQL resolver functions that implement the schema operations
 * Maps GraphQL queries and mutations to their corresponding business logic
 */
export const resolvers = {
  Query: {
    hello: (): string => 'Hello from Focus Training Academy API!',
    health: () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }),
  },
}