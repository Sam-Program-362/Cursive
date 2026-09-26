import { NextRequest, NextResponse } from "next/server";

const PISTON_EXECUTE_URL = "https://emkc.org/api/v2/piston/execute";
const PISTON_RUNTIMES_URL = "https://emkc.org/api/v2/piston/runtimes";

// Piston's runtime list changes over time. Resolve a version when the client
// does not provide one rather than relying on a version installed on Vercel.
async function resolveVersion(language: string, requestedVersion?: string) {
  if (requestedVersion && requestedVersion !== "*") return requestedVersion;

  const response = await fetch(PISTON_RUNTIMES_URL, {
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error("Unable to retrieve Piston runtimes");

  const runtimes = (await response.json()) as Array<{
    language: string;
    version: string;
  }>;
  const runtime = runtimes.find((item) => item.language === language);
  if (!runtime) throw new Error(`Piston does not support language "${language}"`);
  return runtime.version;
}

function filenameFor(language: string) {
  const extensions: Record<string, string> = {
    python: "py",
    javascript: "js",
    typescript: "ts",
    cpp: "cpp",
    c: "c",
    rust: "rs",
  };
  return `main.${extensions[language] || "txt"}`;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const language = String(body.language || "python");
    const code = typeof body.code === "string" ? body.code : "";
    const stdin = typeof body.stdin === "string" ? body.stdin : "";

    if (!code) {
      return NextResponse.json({ error: "No code provided to execute" }, { status: 400 });
    }

    const version = await resolveVersion(language, body.version);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let pistonResponse: Response;
    try {
      pistonResponse = await fetch(PISTON_EXECUTE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          version,
          files: [{ name: filenameFor(language), content: code }],
          stdin,
          args: Array.isArray(body.args) ? body.args : [],
          compile_timeout: 10000,
          run_timeout: 5000,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const pistonData = await pistonResponse.json().catch(() => ({}));
    if (!pistonResponse.ok) {
      const message = pistonData.message || `Piston returned HTTP ${pistonResponse.status}`;
      return NextResponse.json({ error: message, stderr: message, output: message, exitCode: 1, status: "error" }, { status: 502 });
    }

    const run = pistonData.run || {};
    const stdout = run.stdout || "";
    const stderr = run.stderr || "";
    const exitCode = typeof run.code === "number" ? run.code : 1;

    return NextResponse.json({
      stdout,
      stderr,
      output: run.output || stdout || stderr || "Program executed with no output.",
      exitCode,
      executionTime: Date.now() - startTime,
      language: pistonData.language || language,
      version: pistonData.version || version,
      status: exitCode === 0 ? "success" : "error",
      engine: "piston-cloud",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to execute code in Piston sandbox.";
    console.error("Piston execution error:", error);
    return NextResponse.json({ stdout: "", stderr: message, output: message, exitCode: 1, status: "error" }, { status: 502 });
  }
}
