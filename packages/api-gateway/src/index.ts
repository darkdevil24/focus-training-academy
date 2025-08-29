import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { typeDefs } from './schema'
import { resolvers } from './resolvers'

const app = express()
const PORT = process.env.PORT || 4000

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://localhost:3000',
  credentials: true,
}))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

/**
 * Main entry point for the API Gateway service
 * Initializes the Apollo Server with the GraphQL schema and resolvers,
 * configures middleware, and starts listening on the configured port
 * @returns Promise that resolves when the server is successfully started
 */
async function startServer(): Promise<void> {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  })

  await server.start()

  app.use('/graphql', express.json(), expressMiddleware(server))

  app.listen(PORT, () => {
    console.log(`🚀 API Gateway running at http://localhost:${PORT}`)
    console.log(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`)
  })
}

startServer().catch(error => {
  console.error('Failed to start server:', error)
  process.exit(1)
})