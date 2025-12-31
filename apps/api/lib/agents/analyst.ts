
import { BaseAgent, type AgentState } from "./core/base";
import { getGithubTools } from "./tools/github";
import { repoAnalysis } from "../../../db/schema";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

interface AnalystState extends AgentState {
    correction?: string;
}

export class GithubAnalystAgent extends BaseAgent<Env, AnalystState> {
    agentName = "GithubAnalystAgent";

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
            const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
            this.ctx.acceptWebSocket(server);
            server.send(JSON.stringify({ type: "hello", msg: "connected" }));
            return new Response(null, { status: 101, webSocket: client });
        }
        return new Response("Not found", { status: 404 });
    }

    override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
        try {
            const text = typeof message === "string" ? message : new TextDecoder().decode(message);
            const obj = JSON.parse(text);

            if (obj?.type === "correction") {
                this.setState({ ...this.state, correction: obj.message });
                ws.send(JSON.stringify({ type: "ack" }));
            }
        } catch (e: any) {
            ws.send(JSON.stringify({ type: "error", message: e.message }));
        }
    }

    async run(requestId: string, repoUrl: string, userQuery: string): Promise<void> {
        await this.status(requestId, "analyzing");
        await this.logRequest(requestId, "info", `Analyzing repository: ${repoUrl}`);
        const db = this.env.DB;

        try {
            const existingAnalysis = await db.query.repoAnalysis.findFirst({
                where: and(
                    eq(repoAnalysis.requestId, requestId),
                    eq(repoAnalysis.repoUrl, repoUrl)
                ),
            });

            if (existingAnalysis) {
                await this.logRequest(requestId, "info", `Skipping analysis for ${repoUrl}, already analyzed.`);
                return;
            }


            const urlParts = new URL(repoUrl);
            const pathParts = urlParts.pathname.split("/").filter(Boolean);
            if (pathParts.length < 2) {
                throw new Error("Invalid repository URL");
            }
            const owner = pathParts[0];
            const repo = pathParts[1];

            // 1. Get repository details.
            const repoDetails = await this.tools.github_get_repo.execute({
                owner,
                repo,
            });


            // 2. Analyze the repository content.
            const readmeContent = await this.tools.github_read_file.execute({
                owner,
                repo,
                path: "README.md",
            });

            const packageJsonContent = await this.tools.github_read_file.execute({
                owner,
                repo,
                path: "package.json",
            }).catch(() => null); // Ignore errors if package.json doesn't exist.


            // 3. Generate analysis.
            const analysisPrompt = `
                Original user query: "${userQuery}"
                Repository: ${repoUrl}
                README:
                ---
                ${readmeContent}
                ---
                package.json:
                ---
                ${packageJsonContent || "Not found"}
                ---
                ${this.state.correction ? `Correction from orchestrator: ${this.state.correction}` : ""}

                Based on the information above, please provide a detailed analysis of this repository.
                - How relevant is this repository to the user's query?
                - What is the primary purpose of this repository?
                - What is the tech stack?
                - What are the pros and cons of this repository?

                Provide your analysis as a JSON object with the following structure:
                {
                    "ai_ranking": number, // A number between 1 and 100, where 100 is most relevant.
                    "ai_summary": string,
                    "ai_pros_cons": {
                        "pros": string[],
                        "cons": string[]
                    },
                    "tech_stack": string[]
                }
            `;

            const analysis = await this.generateStructured(analysisPrompt, z.object({
                ai_ranking: z.number(),
                ai_summary: z.string(),
                ai_pros_cons: z.object({
                    pros: z.array(z.string()),
                    cons: z.array(z.string()),
                }),
                tech_stack: z.array(z.string()),
            }));


            // 4. Save the analysis to the database.
            await db.insert(repoAnalysis).values({
                id: crypto.randomUUID(),
                requestId,
                repoUrl,
                agentId: this.agentName,
                status: "complete",
                aiRanking: analysis.ai_ranking,
                aiSummary: analysis.ai_summary,
                aiProsCons: analysis.ai_pros_cons,
                stars: repoDetails.stargazers_count,
                techStack: analysis.tech_stack,
            });


            await this.status(requestId, "complete");
            await this.logRequest(requestId, "info", "Analysis complete.");

        } catch (error: any) {
            await this.status(requestId, "error", error.message);
            await this.logRequest(requestId, "error", "Analysis failed", { error: error.message });
        }
    }
}
