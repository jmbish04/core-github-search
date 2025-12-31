import { z } from '../../utils/schema';
import { getOctokit } from './core';
import { Env as Bindings } from '../../types';

export const getGithubTools = (env: Bindings) => {
    return [
        // ==========================================
        // Files & Content
        // ==========================================
        {
            name: "github_read_file",
            description: "Read a file from a GitHub repository.",
            parameters: z.object({
                owner: z.string(),
                repo: z.string(),
                path: z.string(),
                ref: z.string().optional().describe("The branch, tag, or commit SHA")
            }),
            execute: async (args: { owner: string, repo: string, path: string, ref?: string }) => {
                const octokit = getOctokit(env);
                try {
                    const { data } = await octokit.repos.getContent({
                        owner: args.owner,
                        repo: args.repo,
                        path: args.path,
                        ref: args.ref
                    });

                    if (Array.isArray(data) || !('content' in data)) {
                        throw new Error(`Path '${args.path}' is a directory or submodule, not a file.`);
                    }

                    return Buffer.from(data.content, 'base64').toString('utf-8');
                } catch (e: any) {
                    throw new Error(`Failed to read file: ${e.message}`);
                }
            }
        },
        {
            name: "github_list_files",
            description: "List files in a GitHub repository directory.",
            parameters: z.object({
                owner: z.string(),
                repo: z.string(),
                path: z.string().optional(),
                ref: z.string().optional()
            }),
            execute: async (args: { owner: string, repo: string, path?: string, ref?: string }) => {
                const octokit = getOctokit(env);
                try {
                    const { data } = await octokit.repos.getContent({
                        owner: args.owner,
                        repo: args.repo,
                        path: args.path || '',
                        ref: args.ref
                    });
                    return data;
                } catch (e: any) {
                    throw new Error(`Failed to list files: ${e.message}`);
                }
            }
        },
        {
            name: "github_push_file",
            description: "Create or update a file in a GitHub repository. Automatically handles GET for SHA if updating.",
            parameters: z.object({
                owner: z.string(),
                repo: z.string(),
                path: z.string(),
                content: z.string(),
                message: z.string().describe("Commit message"),
                branch: z.string().optional().default("main")
            }),
            execute: async (args: { owner: string, repo: string, path: string, content: string, message: string, branch?: string }) => {
                const octokit = getOctokit(env);
                let sha: string | undefined;

                try {
                    // Try to get existing file SHA
                    const { data } = await octokit.repos.getContent({
                        owner: args.owner,
                        repo: args.repo,
                        path: args.path,
                        ref: args.branch
                    });
                    if (!Array.isArray(data) && 'sha' in data) {
                        sha = data.sha;
                    }
                } catch (e) {
                    // Ignore 404 (file doesn't exist), throw others
                }

                const { data: commit } = await octokit.repos.createOrUpdateFileContents({
                    owner: args.owner,
                    repo: args.repo,
                    path: args.path,
                    message: args.message,
                    content: Buffer.from(args.content).toString('base64'),
                    branch: args.branch,
                    sha
                });

                return commit;
            }
        },

        // ==========================================
        // Issues
        // ==========================================
        {
            name: "github_list_issues",
            description: "List issues in a repository.",
            parameters: z.object({
                owner: z.string(),
                repo: z.string(),
                state: z.enum(['open', 'closed', 'all']).optional().default('open'),
                labels: z.array(z.string()).optional(),
                page: z.number().optional().default(1),
                per_page: z.number().optional().default(30)
            }),
            execute: async (args: { owner: string, repo: string, state?: 'open' | 'closed' | 'all', labels?: string[], page?: number, per_page?: number }) => {
                const octokit = getOctokit(env);
                const { data } = await octokit.rest.issues.listForRepo({
                    owner: args.owner,
                    repo: args.repo,
                    state: args.state,
                    labels: args.labels?.join(','),
                    page: args.page,
                    per_page: args.per_page
                });
                return data;
            }
        },
        {
            name: "github_create_issue",
            description: "Create a new issue.",
            parameters: z.object({
                owner: z.string(),
                repo: z.string(),
                title: z.string(),
                body: z.string().optional(),
                assignees: z.array(z.string()).optional(),
                labels: z.array(z.string()).optional()
            }),
            execute: async (args: { owner: string, repo: string, title: string, body?: string, assignees?: string[], labels?: string[] }) => {
                const octokit = getOctokit(env);
                const { data } = await octokit.rest.issues.create({
                    owner: args.owner,
                    repo: args.repo,
                    title: args.title,
                    body: args.body,
                    assignees: args.assignees,
                    labels: args.labels
                });
                return data;
            }
        },
        {
            name: "github_update_issue",
            description: "Update an existing issue.",
            parameters: z.object({
                owner: z.string(),
                repo: z.string(),
                issue_number: z.number(),
                title: z.string().optional(),
                body: z.string().optional(),
                state: z.enum(['open', 'closed']).optional(),
                labels: z.array(z.string()).optional()
            }),
            execute: async (args: { owner: string, repo: string, issue_number: number, title?: string, body?: string, state?: 'open' | 'closed', labels?: string[] }) => {
                const octokit = getOctokit(env);
                const { data } = await octokit.rest.issues.update({
                    owner: args.owner,
                    repo: args.repo,
                    issue_number: args.issue_number,
                    title: args.title,
                    body: args.body,
                    state: args.state,
                    labels: args.labels
                });
                return data;
            }
        },
        {
            name: "github_add_issue_comment",
            description: "Add a comment to an issue or pull request.",
            parameters: z.object({
                owner: z.string(),
                repo: z.string(),
                issue_number: z.number(),
                body: z.string()
            }),
            execute: async (args: { owner: string, repo: string, issue_number: number, body: string }) => {
                const octokit = getOctokit(env);
                const { data } = await octokit.rest.issues.createComment({
                    owner: args.owner,
                    repo: args.repo,
                    issue_number: args.issue_number,
                    body: args.body
                });
                return data;
            }
        },

        // ==========================================
        // Pull Requests
        // ==========================================
        {
            name: "github_list_pull_requests",
            description: "List pull requests in a repository.",
            parameters: z.object({
                owner: z.string(),
                repo: z.string(),
                state: z.enum(['open', 'closed', 'all']).optional().default('open'),
                page: z.number().optional().default(1),
                per_page: z.number().optional().default(30)
            }),
            execute: async (args: { owner: string, repo: string, state?: 'open' | 'closed' | 'all', page?: number, per_page?: number }) => {
                const octokit = getOctokit(env);
                const { data } = await octokit.rest.pulls.list({
                    owner: args.owner,
                    repo: args.repo,
                    state: args.state,
                    page: args.page,
                    per_page: args.per_page
                });
                return data;
            }
        },
        {
            name: "github_get_pull_request",
            description: "Get a single pull request.",
            parameters: z.object({
                owner: z.string(),
                repo: z.string(),
                pull_number: z.number()
            }),
            execute: async (args: { owner: string, repo: string, pull_number: number }) => {
                const octokit = getOctokit(env);
                const { data } = await octokit.rest.pulls.get({
                    owner: args.owner,
                    repo: args.repo,
                    pull_number: args.pull_number
                });
                return data;
            }
        },
        {
            name: "github_create_pull_request",
            description: "Create a new pull request.",
            parameters: z.object({
                owner: z.string(),
                repo: z.string(),
                title: z.string(),
                head: z.string().describe("The name of the branch where your changes are implemented"),
                base: z.string().describe("The name of the branch you want the changes pulled into"),
                body: z.string().optional()
            }),
            execute: async (args: { owner: string, repo: string, title: string, head: string, base: string, body?: string }) => {
                const octokit = getOctokit(env);
                const { data } = await octokit.rest.pulls.create({
                    owner: args.owner,
                    repo: args.repo,
                    title: args.title,
                    head: args.head,
                    base: args.base,
                    body: args.body
                });
                return data;
            }
        },
        {
            name: "github_merge_pull_request",
            description: "Merge a pull request.",
            parameters: z.object({
                owner: z.string(),
                repo: z.string(),
                pull_number: z.number(),
                commit_title: z.string().optional(),
                merge_method: z.enum(['merge', 'squash', 'rebase']).optional()
            }),
            execute: async (args: { owner: string, repo: string, pull_number: number, commit_title?: string, merge_method?: 'merge' | 'squash' | 'rebase' }) => {
                const octokit = getOctokit(env);
                const { data } = await octokit.rest.pulls.merge({
                    owner: args.owner,
                    repo: args.repo,
                    pull_number: args.pull_number,
                    commit_title: args.commit_title,
                    merge_method: args.merge_method
                });
                return data;
            }
        },

        // ==========================================
        // Branches & Refs
        // ==========================================
        {
            name: "github_create_branch",
            description: "Create a new branch from a source branch (default: main).",
            parameters: z.object({
                owner: z.string(),
                repo: z.string(),
                branch: z.string(),
                from_branch: z.string().optional().default("main")
            }),
            execute: async (args: { owner: string, repo: string, branch: string, from_branch?: string }) => {
                const octokit = getOctokit(env);
                // 1. Get SHA of source branch
                const { data: refData } = await octokit.git.getRef({
                    owner: args.owner,
                    repo: args.repo,
                    ref: `heads/${args.from_branch}`
                });
                const sha = refData.object.sha;

                // 2. Create new ref
                const { data: newRef } = await octokit.git.createRef({
                    owner: args.owner,
                    repo: args.repo,
                    ref: `refs/heads/${args.branch}`,
                    sha
                });
                return newRef;
            }
        },

        // ==========================================
        // Search
        // ==========================================
        {
            name: "github_search_code",
            description: "Search for code in a repository.",
            parameters: z.object({
                q: z.string(),
                per_page: z.number().optional().default(10)
            }),
            execute: async (args: { q: string, per_page?: number }) => {
                const octokit = getOctokit(env);
                const { data } = await octokit.rest.search.code({
                    q: args.q,
                    per_page: args.per_page
                });
                return data;
            }
        },

        // ==========================================
        // Repos
        // ==========================================
        {
            name: "github_get_repo",
            description: "Get repository details.",
            parameters: z.object({
                owner: z.string(),
                repo: z.string(),
            }),
            execute: async (args: { owner: string, repo: string }) => {
                const octokit = getOctokit(env);
                const { data } = await octokit.rest.repos.get({
                    owner: args.owner,
                    repo: args.repo,
                });
                return data;
            }
        }
    ];
};
