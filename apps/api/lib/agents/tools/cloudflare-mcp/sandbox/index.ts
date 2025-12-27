import { z } from "../../../utils/schema";
import { Env } from "../../../types";
import { getSandbox } from "@cloudflare/sandbox";

export function loadSandboxTools(env: Env) {
    return [
        {
            name: "sandbox_exec",
            description: "Execute a shell command in the sandbox environment",
            parameters: z.object({
                command: z.string(),
                sandboxId: z.string().optional().default("default")
            }),
            execute: async (args: { command: string, sandboxId?: string }) => {
                if (!env.SANDBOX) throw new Error("SANDBOX binding not found");
                const id = args.sandboxId || "default";
                const sandbox = getSandbox(env.SANDBOX as any, id);
                const res = await sandbox.exec(args.command);
                return {
                    stdout: res.stdout,
                    stderr: res.stderr,
                    exitCode: res.exitCode
                };
            }
        },
        {
            name: "sandbox_read_file",
            description: "Read a file from the sandbox",
            parameters: z.object({
                path: z.string(),
                sandboxId: z.string().optional().default("default")
            }),
            execute: async (args: { path: string, sandboxId?: string }) => {
                if (!env.SANDBOX) throw new Error("SANDBOX binding not found");
                const id = args.sandboxId || "default";
                const sandbox = getSandbox(env.SANDBOX as any, id);
                // Use cat to read file
                const res = await sandbox.exec(`cat "${args.path}"`);
                if (res.exitCode !== 0) {
                    throw new Error(`Failed to read file: ${res.stderr}`);
                }
                return res.stdout;
            }
        },
        {
            name: "sandbox_write_file",
            description: "Write content to a file in the sandbox",
            parameters: z.object({
                path: z.string(),
                content: z.string(),
                sandboxId: z.string().optional().default("default")
            }),
            execute: async (args: { path: string, content: string, sandboxId?: string }) => {
                if (!env.SANDBOX) throw new Error("SANDBOX binding not found");
                const id = args.sandboxId || "default";
                const sandbox = getSandbox(env.SANDBOX as any, id);
                // Naive write using echo and redirection (careful with escaping)
                // Ideally use a specialized method if available, but exec is universal fallback 
                // Using base64 to avoid shell escaping issues
                const b64 = btoa(args.content);
                const cmd = `echo "${b64}" | base64 -d > "${args.path}"`;
                const res = await sandbox.exec(cmd);
                if (res.exitCode !== 0) {
                    throw new Error(`Failed to write file: ${res.stderr}`);
                }
                return "File / wrote successfully.";
            }
        }
    ];
}
