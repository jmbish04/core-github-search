
import { BaseAgent, type AgentState } from "./core/base";
import { z } from "zod";
import { repoAnalysis, githubRequests, hitlReviews, searchConfigs } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { getGithubTools } from "./tools/github";
import { GithubAnalystAgent } from "./analyst";
import { JudgeAgent } from "./judge";

interface OrchestratorState extends AgentState {
    analystStubs?: { name: string, id: DurableObjectId }[];
}

export class OrchestratorAgent extends BaseAgent<Env, OrchestratorState> {
    agentName = "OrchestratorAgent";
    analystSockets: WebSocket[] = [];

    protected defineTools() {
        return {
            ...getGithubTools(this.env),
        };
    }

    override async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        if (url.pathname === "/ws") {
            if (request.headers.get("Upgrade") !== "websocket")
                return new Response("Expected websocket", { status: 400 });
            const pair = new WebSocketPair();
            const [client, server] = [pair[0], pair[1]];
            this.ctx.acceptWebSocket(server);
            server.send(JSON.stringify({ type: "hello", msg: "connected" }));
            return new Response(null, { status: 101, webSocket: client });
        }
        return new Response("Not found", { status: 404 });
    }


    async start(requestId: string, query: string, config: any): Promise<void> {
        await this.logRequest(requestId, "info", "Starting new search.", { query, config });
        const db = this.env.DB;

        // Phase 1: Sampling
        await this.status(requestId, "sampling");
        this.broadcast("status", { requestId, status: "sampling" });
        const searchQueries = await this.generateSearchQueries(query);
        const searchResults = await Promise.all(
            searchQueries.map((q) => this.tools.github_search_code.execute({ q }))
        );
        const top5Repos = searchResults.flatMap((r: any) => r.items).slice(0, 5);


        // Phase 2: HITL
        await this.status(requestId, "hitl");
        this.broadcast("status", { requestId, status: "hitl" });
        const hitlReviewsToCreate = top5Repos.map((repo: any) => ({
            id: crypto.randomUUID(),
            requestId,
            repoSnapshotJson: repo,
        }));


        await db.insert(hitlReviews).values(hitlReviewsToCreate);
        this.broadcast("hitl", { requestId, reviews: hitlReviewsToCreate });


        // The workflow will now pause until the user submits their HITL reviews.
        // The frontend will call the POST /agent/hitl/{reviewId}/review endpoint,
        // which will trigger the continuation of the workflow.
    }

    async continue(requestId: string): Promise<void> {
        const db = this.env.DB;

        const request = await db.query.githubRequests.findFirst({
            where: eq(githubRequests.id, requestId),
            with: {
                hitlReviews: true,
            },
        });

        if (!request) {
            throw new Error("Request not found");
        }

        const config = await db.query.searchConfigs.findFirst({
            where: eq(searchConfigs.isDefault, true),
        });

        const reposToAnalyzeCount = config?.reposToAnalyze ?? 20;


        // Phase 3: Expansion
        await this.status(requestId, "expansion");
        this.broadcast("status", { requestId, status: "expansion" });

        const positiveReviews = request.hitlReviews.filter((r) => r.userVerdict);
        const refinedSearchQueries = await this.refineSearchQueries(
            request.query,
            positiveReviews.map((r) => r.repoSnapshotJson)
        );


        // Phase 4: Delegation
        await this.status(requestId, "delegation");
        this.broadcast("status", { requestId, status: "delegation" });
        const searchResults = await Promise.all(
            refinedSearchQueries.map((q) => this.tools.github_search_code.execute({ q }))
        );
        const reposToAnalyze = searchResults.flatMap((r: any) => r.items).slice(0, reposToAnalyzeCount);


        // Phase 5: Supervision
        await this.status(requestId, "supervision");
        this.broadcast("status", { requestId, status: "supervision" });

        const concurrency = 5;
        const queue = [...reposToAnalyze];
        const running: Promise<void>[] = [];
        const analystStubs = [];

        for (const repo of reposToAnalyze) {
            const analystDO = this.env.ANALYST;
            const analystId = analystDO.idFromName(`${requestId}-${repo.html_url}`);
            analystStubs.push({ name: `${requestId}-${repo.html_url}`, id: analystId });
        }
        this.setState({ ...this.state, analystStubs });

        if (this.analystSockets.length === 0 && this.state.analystStubs) {
            for (const stubInfo of this.state.analystStubs) {
                const analystStub = this.env.ANALYST.get(stubInfo.id);
                const response = await analystStub.fetch("http://dummy-url/ws", { headers: { "Upgrade": "websocket" } });
                if (response.webSocket) {
                    this.analystSockets.push(response.webSocket);
                }
            }
        }

        const processQueue = () => {
            while (running.length < concurrency && queue.length > 0) {
                const repo = queue.shift();
                if (repo) {
                    const analystDO = this.env.ANALYST;
                    const analyst = analystDO.get(
                        analystDO.idFromName(`${requestId}-${repo.html_url}`),
                    ) as unknown as GithubAnalystAgent;

                    const promise = analyst.run(requestId, repo.html_url, request.query)
                        .then(() => {
                            const index = running.indexOf(promise);
                            if (index > -1) {
                                running.splice(index, 1);
                            }
                            processQueue();
                        });
                    running.push(promise);
                }
            }
        }

        processQueue();


        const monitor = setInterval(async () => {
            const analysisResults = await db.query.repoAnalysis.findMany({
                where: eq(repoAnalysis.requestId, requestId),
            });

            if (analysisResults.some(r => (r.aiRanking ?? 0) < 10)) {
                this.analystSockets.forEach(ws => {
                    ws.send(JSON.stringify({
                        type: "correction",
                        message: "The AI ranking seems low. Please be more generous with your rankings.",
                    }));
                });
            }

        }, 15000);


        while (running.length > 0) {
            await Promise.race(running);
        }

        clearInterval(monitor);
        this.analystSockets.forEach(ws => ws.close());


        // Phase 6: Synthesis
        await this.status(requestId, "synthesis");
        this.broadcast("status", { requestId, status: "synthesis" });

        const analysisResults = await db.query.repoAnalysis.findMany({
            where: eq(repoAnalysis.requestId, requestId),
        });
        let top12Results = analysisResults.sort((a, b) => (b.aiRanking ?? 0) - (a.aiRanking ?? 0)).slice(0, 12);


        // Phase 7: Handoff & Enrichment Loop
        await this.status(requestId, "handoff");
        this.broadcast("status", { requestId, status: "handoff" });
        const judgeDO = this.env.JUDGE;
        const judge = judgeDO.get(
            judgeDO.idFromName(requestId),
        ) as unknown as JudgeAgent;

        let finalResults = await judge.review(requestId, request.query, top12Results);
        const rejectedResults = top12Results.filter(r => !finalResults.some(fr => fr.id === r.id));

        if (rejectedResults.length > 0) {
            // In a real implementation, we would re-run the analysts with the enrichment requests.
            // For now, we will just log the enrichment requests.
            await this.logRequest(requestId, "info", "Enrichment requested.", { rejectedResults });
        }


        await this.status(requestId, "completed");
        this.broadcast("status", { requestId, status: "completed", results: finalResults });
        await this.logRequest(requestId, "info", "Search complete.");
    }



    private async generateSearchQueries(userQuery: string): Promise<string[]> {
        const prompt = `
            Based on the user's query, generate 3-5 distinct GitHub search queries to find relevant repositories.
            User query: "${userQuery}"
            Return a JSON array of strings.
        `;
        const result = await this.generateStructured(prompt, z.array(z.string()));
        return result;
    }

    private async refineSearchQueries(userQuery: string, positiveExamples: any[]): Promise<string[]> {
        const prompt = `
            The user initially provided this query: "${userQuery}"
            They have since approved the following repositories:
            ---
            ${JSON.stringify(positiveExamples, null, 2)}
            ---
            Based on this new information, generate 3-5 new, more specific GitHub search queries.
            Return a JSON array of strings.
        `;
        const result = await this.generateStructured(prompt, z.array(z.string()));
        return result;
    }


    override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
        try {
            const text = typeof message === "string" ? message : new TextDecoder().decode(message);
            const obj = JSON.parse(text);
            const db = this.env.DB;

            if (obj?.type === "chat") {
                const { query, requestId } = obj;

                const results = await db.query.repoAnalysis.findMany({
                    where: eq(repoAnalysis.requestId, requestId),
                });

                const chatPrompt = `
                    The user has asked a follow-up question about the results.
                    User question: "${query}"
                    Results:
                    ---
                    ${JSON.stringify(results, null, 2)}
                    ---
                    Please answer the user's question based on the results.
                `;
                const answer = await this.generateText(chatPrompt);
                ws.send(JSON.stringify({ type: "chat", answer }));
            }

        } catch (e: any) {
            ws.send(JSON.stringify({ type: "error", message: e.message }));
        }
    }
}
