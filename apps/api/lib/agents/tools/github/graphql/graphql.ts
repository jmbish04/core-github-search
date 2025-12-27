/**
 * @file src/octokit/graphql/graphql.ts
 * @description This file contains the implementation of the GitHub GraphQL API proxy.
 * @owner AI-Builder
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { getGraphql } from '../core'
import { Env } from '../../../types'
import { Bindings } from '../../../utils/hono'

// --- 1. Zod Schema Definitions ---

const GraphqlRequestSchema = z.object({
  query: z.string().openapi({ example: '{ viewer { login } }' }),
  variables: z.record(z.string(), z.any()).optional().openapi({ example: { first: 10 } }),
})

const GraphqlResponseSchema = z.object({
  data: z.record(z.string(), z.any()),
  errors: z.array(z.record(z.string(), z.any())).optional(),
})

// --- 2. Route Definition ---

const graphqlRoute = createRoute({
  method: 'post',
  path: '/',
  operationId: 'postOctokitGraphqlProxy',
  request: {
    body: {
      content: {
        'application/json': {
          schema: GraphqlRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GraphqlResponseSchema,
        },
      },
      description: 'GraphQL query executed successfully.',
    },
  },
  description: 'Proxy for the GitHub GraphQL API.',
})

// --- 3. Hono App and Handler ---

const graphql = new OpenAPIHono<{ Bindings: Bindings }>()

graphql.openapi(graphqlRoute, async (c) => {
  const { query, variables } = c.req.valid('json')
  const gql = getGraphql(c.env)

  const response = await gql(query, variables)

  return c.json({ data: response } as any)
})

const graphqlApi = new OpenAPIHono<{ Bindings: Bindings }>()
graphqlApi.route('/graphql', graphql)

export default graphqlApi

/**
 * @extension_point
 * This is a good place to add any custom logic to the GraphQL proxy,
 * such as query caching or rate limiting.
 */
