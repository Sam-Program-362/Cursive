/**
 * Main-thread client for the Pyodide Web Worker (phase 2).
 *
 * Owns the SharedArrayBuffer stdin channel: the worker blocks on Atomics.wait
 * while the terminal panel collects an answer inline, and the timeout is
 * paused for as long as an input request is outstanding so a slow typist
 * never trips the limit. On timeout the worker is terminated, which actually
 * stops a runaway Python program (impossible with the in-page runner).
 */

import {
  MainToWorker,
  WorkerToMain,
  SAB_SIZE,
  META_WORDS,
  DATA_OFFSET,
  MAX_LINE_BYTES,
  STATE_LINE_READY,
} from "./pyodide-worker-protocol";

export interface WorkerRunOptions {
  timeoutMs: number;
  /** Live stdout/stderr chunks as the program writes them. */
  onOutput?: (text: string, isError: boolean) => void;
  /**
   * Asked when input() runs out of pre-filled lines. Resolve with the line
   * the user typed (empty string on cancel). While pending, the timeout is
   * frozen.
   */
  requestInput?: (prompt: string) => Promise<string>;
}

export interface WorkerRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

/** True when SharedArrayBuffer + workers are available (COOP/COEP applied). */
export function canUsePyodideWorker(): boolean {
  return (
    typeof window !== "undefined" &&
    window.crossOriginIsolated === true &&
    typeof SharedArrayBuffer !== "undefined" &&
    typeof Worker !== "undefined"
  );
}

let worker: Worker | null = null;
let isReady = false;
let sab: SharedArrayBuffer | null = null;
let meta: Int32Array | null = null;
let payload: Uint8Array | null = null;
let nextRunId = 1;

const encoder = new TextEncoder();

/** Whether the worker's Pyodide instance has finished loading. */
export function isPyodideWorkerReady(): boolean {
  return isReady;
}

function spawnWorker(): Worker {
  if (!sab) {
    sab = new SharedArrayBuffer(SAB_SIZE);
    meta = new Int32Array(sab, 0, META_WORDS);
    payload = new Uint8Array(sab, DATA_OFFSET);
  }
  const w = new Worker(new URL("./pyodide-worker.ts", import.meta.url), {
    name: "cursive-pyodide",
  });
  isReady = false;
  worker = w;
  w.onmessage = (ev: MessageEvent<WorkerToMain>) => {
    const msg = ev.data;
    if (msg.type === "ready") {
      isReady = true;
      return;
    }
    runHandlers.get(msg.runId)?.(msg);
  };
  w.onerror = (ev: ErrorEvent) => {
    console.error("Pyodide worker error:", ev.message);
  };
  const attach: MainToWorker = { type: "attach", sab: sab! };
  w.postMessage(attach);
  return w;
}

function terminateWorker(): void {
  worker?.terminate();
  worker = null;
  isReady = false;
  runHandlers.clear();
}

const runHandlers = new Map<number, (msg: WorkerToMain) => void>();

/** Write one answer line into the shared buffer and wake the worker. */
function writeLine(text: string): void {
  if (!meta || !payload) return;
  const bytes = encoder.encode(text).subarray(0, MAX_LINE_BYTES);
  payload.set(bytes, 0);
  Atomics.store(meta, 1, bytes.length);
  Atomics.store(meta, 0, STATE_LINE_READY);
  Atomics.notify(meta, 0);
}

export async function runPythonInWorker(
  code: string,
  stdin: string,
  options: WorkerRunOptions
): Promise<WorkerRunResult> {
  const w = worker ?? spawnWorker();

  const runId = nextRunId++;
  let startedAt: number | null = null; // set when the worker reports "started"
  let pausedMs = 0;
  let inputWaitStart: number | null = null;
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let startupTimer: ReturnType<typeof setTimeout> | undefined;
  let resolveRun!: (result: WorkerRunResult) => void;
  const finished = new Promise<WorkerRunResult>((resolve) => {
    resolveRun = resolve;
  });

  const chunks: { text: string; isError: boolean }[] = [];
  const assemblePartial = () => ({
    stdout: chunks.filter((c) => !c.isError).map((c) => c.text).join(""),
    stderr: chunks.filter((c) => c.isError).map((c) => c.text).join(""),
  });

  const finish = (result: WorkerRunResult) => {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    if (startupTimer) clearTimeout(startupTimer);
    runHandlers.delete(runId);
    resolveRun(result);
  };

  // The timeout starts when the worker reports the run has started (so the
  // first-run Pyodide download does not eat the budget), re-arms against the
  // remaining budget, and freezes completely while an input request is
  // outstanding (time spent waiting for the user never counts towards it).
  const scheduleTimeout = () => {
    if (settled || startedAt === null) return;
    if (timer) clearTimeout(timer);
    if (inputWaitStart !== null) return;
    const elapsed = Date.now() - startedAt - pausedMs;
    const remaining = options.timeoutMs - elapsed;
    if (remaining <= 0) {
      const { stdout, stderr } = assemblePartial();
      terminateWorker(); // stops the runaway Python program for real
      finish({
        stdout,
        stderr:
          (stderr ? stderr + "\n" : "") +
          `TimeoutError: execution exceeded ${Math.round(
            options.timeoutMs / 1000
          )}s and was stopped. (The Python worker was terminated and will restart on the next run.)`,
        exitCode: 1,
        timedOut: true,
      });
      return;
    }
    timer = setTimeout(scheduleTimeout, remaining);
  };

  const onMessage = (msg: WorkerToMain) => {
    switch (msg.type) {
      case "started":
        startedAt = Date.now();
        scheduleTimeout();
        return;
      case "output":
        chunks.push({ text: msg.text, isError: msg.isError });
        options.onOutput?.(msg.text, msg.isError);
        return;
      case "input-request": {
        inputWaitStart = Date.now();
        scheduleTimeout(); // freeze the countdown while we wait for the user
        const respond = (line: string) => {
          if (settled || inputWaitStart === null) return;
          writeLine(line);
          pausedMs += Date.now() - inputWaitStart;
          inputWaitStart = null;
          scheduleTimeout(); // resume with the remaining budget
        };
        if (!options.requestInput) {
          respond("");
          return;
        }
        options.requestInput(msg.prompt).then(respond);
        return;
      }
      case "done":
        finish({
          stdout: msg.stdout,
          stderr: msg.stderr,
          exitCode: msg.exitCode,
          timedOut: false,
        });
        return;
      case "error": {
        const { stdout, stderr } = assemblePartial();
        finish({
          stdout,
          stderr: (stderr ? stderr + "\n" : "") + msg.message,
          exitCode: 1,
          timedOut: false,
        });
        return;
      }
    }
  };

  runHandlers.set(runId, onMessage);
  // Watchdog for the pre-start phase (Pyodide download / worker boot): if
  // neither "started" nor "error" ever arrives, give up and restart.
  startupTimer = setTimeout(() => {
    terminateWorker();
    finish({
      stdout: "",
      stderr:
        "TimeoutError: the Python runtime did not start within 60s — check your connection (Pyodide loads from a CDN on first use).",
      exitCode: 1,
      timedOut: true,
    });
  }, 60_000);

  const runMsg: MainToWorker = {
    type: "run",
    runId,
    code,
    stdinLines: stdin.length ? stdin.split("\n") : [],
  };
  w.postMessage(runMsg);

  return finished;
}
