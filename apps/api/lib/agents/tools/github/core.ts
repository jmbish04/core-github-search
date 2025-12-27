/**
 * @file src/octokit/core.ts
 * @description This file initializes the Octokit REST and GraphQL clients with retry and throttling plugins.
 * @owner AI-Builder
 */

// core.ts
import { Octokit } from '@octokit/rest'
import { graphql } from '@octokit/graphql'
import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'
import { Env as Bindings } from '../../types'

const MyOctokit = Octokit.plugin(retry, throttling)

/**
 * Returns the Octokit REST client.
 * @returns {Octokit} The Octokit REST client.
 */
export const getOctokit = (bindings: Bindings): Octokit => {
  const token = bindings.GITHUB_TOKEN;
  console.log(`[getOctokit] Initializing with token: ${token ? (token.substring(0, 4) + '...') : 'MISSING'}`);

  return new MyOctokit({
    auth: bindings.GITHUB_TOKEN,
    throttle: {
      onRateLimit: (retryAfter, options, octokit, retryCount) => {
        octokit.log.warn(
          `Request quota exhausted for request ${options.method} ${options.url}`
        );

        if (retryCount < 1) {
          octokit.log.info(`Retrying after ${retryAfter} seconds!`);
          return true;
        }
      },
      onSecondaryRateLimit: (retryAfter, options, octokit) => {
        octokit.log.warn(
          `SecondaryRateLimit detected for request ${options.method} ${options.url}`
        );
      },
    },
  })
}

/**
 * Returns the Octokit GraphQL client.
 * @returns {graphql} The Octokit GraphQL client.
 */
export const getGraphql = (bindings: Bindings): typeof graphql => {
  return graphql.defaults({
    headers: {
      authorization: `token ${bindings.GITHUB_TOKEN}`,
    },
  })
}
