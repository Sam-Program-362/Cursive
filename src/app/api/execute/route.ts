import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { language, version, code, stdin, args } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: "No code provided to execute" },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // 1. Try Piston Execution API first (for Vercel serverless environment)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const pistonRes = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: language || "python",
          version: version || "*",
          files: [{ content: code }],
          stdin: stdin || "",
          args: args || [],
          compile_timeout: 10000,
          run_timeout: 5000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (pistonRes.ok) {
        const data = await pistonRes.json();
        const run = data.run || {};
        return NextResponse.json({
          stdout: run.stdout || "",
          stderr: run.stderr || "",
          output:
            run.output ||
            run.stdout ||
            run.stderr ||
            "Program executed with no output.",
          exitCode: typeof run.code === "number" ? run.code : 0,
          executionTime: Date.now() - startTime,
          language: data.language || language,
          version: data.version || version,
          status: run.code === 0 ? "success" : "error",
          engine: "piston-cloud",
        });
      }
    } catch (pistonErr) {
      // Piston unreachable or restricted network, fallback to local executor
    }

    // 2. Fallback local runner
    const localResult = await executeLocally(language, code, stdin);
    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      stdout: localResult.stdout,
      stderr: localResult.stderr,
      output:
        localResult.output ||
        localResult.stdout ||
        localResult.stderr ||
        "Program executed with no output.",
      exitCode: localResult.exitCode,
      executionTime,
      language,
      status: localResult.exitCode === 0 ? "success" : "error",
      engine: "local-sandbox",
    });
  } catch (error: any) {
    console.error("Execution error:", error);
    return NextResponse.json(
      {
        stdout: "",
        stderr: error?.message || "Failed to execute code in sandbox.",
        output: error?.message || "Failed to execute code in sandbox.",
        exitCode: 1,
        status: "error",
      },
      { status: 500 }
    );
  }
}

async function executeLocally(
  language: string,
  code: string,
  stdin?: string
): Promise<{ stdout: string; stderr: string; output: string; exitCode: number }> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "codepad-run-"));

  try {
    if (language === "python" || language === "py") {
      const scriptPath = path.join(tmpDir, "script.py");
      await fs.writeFile(scriptPath, code);
      try {
        const { stdout, stderr } = await execAsync(`python3 "${scriptPath}"`, {
          timeout: 5000,
          maxBuffer: 1024 * 1024,
        });
        return { stdout, stderr, output: stdout || stderr, exitCode: 0 };
      } catch (err: any) {
        return {
          stdout: err.stdout || "",
          stderr: err.stderr || err.message,
          output: err.stdout || err.stderr || err.message,
          exitCode: err.code || 1,
        };
      }
    } else if (
      language === "javascript" ||
      language === "js" ||
      language === "typescript" ||
      language === "ts"
    ) {
      const scriptPath = path.join(tmpDir, "script.js");
      await fs.writeFile(scriptPath, code);
      try {
        const { stdout, stderr } = await execAsync(`node "${scriptPath}"`, {
          timeout: 5000,
          maxBuffer: 1024 * 1024,
        });
        return { stdout, stderr, output: stdout || stderr, exitCode: 0 };
      } catch (err: any) {
        return {
          stdout: err.stdout || "",
          stderr: err.stderr || err.message,
          output: err.stdout || err.stderr || err.message,
          exitCode: err.code || 1,
        };
      }
    } else if (language === "cpp" || language === "c++") {
      const srcPath = path.join(tmpDir, "main.cpp");
      const binPath = path.join(tmpDir, "main.out");
      await fs.writeFile(srcPath, code);
      try {
        await execAsync(`g++ -O2 "${srcPath}" -o "${binPath}"`, {
          timeout: 5000,
        });
        const { stdout, stderr } = await execAsync(`"${binPath}"`, {
          timeout: 5000,
        });
        return { stdout, stderr, output: stdout || stderr, exitCode: 0 };
      } catch (err: any) {
        return {
          stdout: err.stdout || "",
          stderr: err.stderr || err.message,
          output: err.stdout || err.stderr || err.message,
          exitCode: err.code || 1,
        };
      }
    } else if (language === "c") {
      const srcPath = path.join(tmpDir, "main.c");
      const binPath = path.join(tmpDir, "main.out");
      await fs.writeFile(srcPath, code);
      try {
        await execAsync(`gcc -O2 "${srcPath}" -o "${binPath}"`, {
          timeout: 5000,
        });
        const { stdout, stderr } = await execAsync(`"${binPath}"`, {
          timeout: 5000,
        });
        return { stdout, stderr, output: stdout || stderr, exitCode: 0 };
      } catch (err: any) {
        return {
          stdout: err.stdout || "",
          stderr: err.stderr || err.message,
          output: err.stdout || err.stderr || err.message,
          exitCode: err.code || 1,
        };
      }
    }

    return {
      stdout: "",
      stderr: `Language "${language}" execution is configured for Piston Cloud Sandbox when deployed on Vercel.`,
      output: `Language "${language}" execution is configured for Piston Cloud Sandbox.`,
      exitCode: 0,
    };
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}
