
import { BaseAgent, type AgentState } from "./core/base";
import { z } from "zod";

export class JudgeAgent extends BaseAgent<Env, AgentState> {
    agentName = "JudgeAgent";

    protected defineTools() {
        return {};
    }

    async review(requestId: string, userQuery: string, results: any[]): Promise<any[]> {
        await this.status(requestId, "judging");
        await this.logRequest(requestId, "info", "Judging results.");

        const reviewPrompt = `
            Original user query: "${userQuery}"

            Here are the top 12 results from the OrchestratorAgent:
            ---
            ${JSON.stringify(results, null, 2)}
            ---

            Please review these results and determine if they are a good match for the user's query.
            - Are the summaries clear and concise?
            - Are the pros and cons well-reasoned?
            - Is the AI ranking accurate?

            Provide your review as a JSON object with the following structure:
            {
                "approved_results": [
                    {
                        "id": string, // The ID of the result.
                        "reasoning": string,
                    }
                ],
                "rejected_results": [
                    {
                        "id": string,
                        "reasoning": string, // Why the result was rejected.
                        "enrichment_request": string, // What the orchestrator should do to improve the result.
                    }
                ]
            }
        `;

        const review = await this.generateStructured(reviewPrompt, z.object({
            approved_results: z.array(z.object({
                id: z.string(),
                reasoning: z.string(),
            })),
            rejected_results: z.array(z.object({
                id: z.string(),
                reasoning: z.string(),
                enrichment_request: z.string(),
            })),
        }));

        // For now, we will just return the approved results.
        // In the future, the orchestrator will handle the enrichment requests.
        const approvedIds = new Set(review.approved_results.map(r => r.id));
        const finalResults = results.filter(r => approvedIds.has(r.id));


        await this.status(requestId, "judged");
        await this.logRequest(requestId, "info", "Judging complete.", { review });
        return finalResults;
    }
}
