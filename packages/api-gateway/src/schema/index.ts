/**
 * GraphQL schema definition for the Focus Training Academy API
 * Defines the main query types and data structures available to clients
 */
export const typeDefs = `#graphql
  type Query {
    hello: String
    health: HealthStatus
  }

  type HealthStatus {
    status: String!
    timestamp: String!
  }
`