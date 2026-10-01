/**
 * Pyodide runs inside this dedicated Web Worker so Python never blocks the
 * editor UI and a runaway program can be stopped by terminating the worker
 * (used when the page is crossOriginIsolated — see next.config headers).
 *
 * stdin: pre-filled lines from the console's stdin box come first. When they
 * run out, the worker posts an "input-request" to the main thread and blocks
 * on Atomics.wait() against a SharedArrayBuffer, so the Python-side input()
 * call stays synchronous while the user types inline in the terminal panel.
 * The main thread writes the answer into the shared buffer and notifies us.
 * EOF never happens: the main thread always provides a line (empty string on
 * cancel), so input() can never raise "EOFError: EOF when reading a line".
 */

import {
  MainToWorker,
  WorkerToMain,
  META_WORDS,
  DATA_OFFSET,
  MAX_LINE_BYTES,
  STATE_WAITING,
  STATE_LINE_READY,
} from "./pyodide-worker-protocol";

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_SCRIPT_URL = `${PYODIDE_INDEX_URL}pyodide.js`;

type PyodideInterface = {
  runPythonAsync: (code: string) => Promise<unknown>;
  runPython: (code: string) => unknown;
  globals: { get: (name: string) => any; set: (name: string, value: unknown) => void };
  setStdin: (options: { stdin: () => string | null }) => void;
};

const workerScope = self as unknown as {
  postMessage(message: WorkerToMain): void;
  onmessage: ((ev: MessageEvent<MainToWorker>) => void) | null;
  importScripts(url: string): void;
  close(): void;
  loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideInterface>;
};

/* ------------------------------------------------------------------ */
/* Shared stdin state                                                  */
/* ------------------------------------------------------------------ */

let meta: Int32Array | null = null;
let payload: Uint8Array | null = null;
let activePrompt = "";
let stdinLines: string[] = [];
let stdinIndex = 0;
let currentRunId = 0;
const decoder = new TextDecoder();

/** Block the (worker) thread until the main thread provides a line. */
function waitForLine(): string {
  for (;;) {
    const state = Atomics.load(meta!, 0);
    if (state === STATE_LINE_READY) {
      const length = Math.min(Atomics.load(meta!, 1), MAX_LINE_BYTES);
      const text = decoder.decode(payload!.subarray(0, length));
      Atomics.store(meta!, 0, STATE_WAITING);
      return text;
    }
    // state === STATE_WAITING → sleep until notified (or wake spuriously)
    Atomics.wait(meta!, 0, state);
  }
}

/* ------------------------------------------------------------------ */
/* Pyodide lifecycle                                                   */
/* ------------------------------------------------------------------ */

let pyodidePromise: Promise<PyodideInterface> | null = null;

function loadPyodideRuntime(): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      workerScope.importScripts(PYODIDE_SCRIPT_URL);
      if (!workerScope.loadPyodide) {
        throw new Error("Pyodide did not register itself on the worker global.");
      }
      const instance = await workerScope.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
      // JS → Python bridges used by the setup code below.
      instance.globals.set("__cursive_set_prompt", (prompt: unknown) => {
        activePrompt = typeof prompt === "string" ? prompt : String(prompt ?? "");
      });
      instance.globals.set("__cursive_on_stdout", (text: unknown, isError: unknown) => {
        if (typeof text === "string" && text.length) {
          workerScope.postMessage({
            type: "output",
            runId: currentRunId,
            text,
            isError: isError === true,
          });
        }
      });
      workerScope.postMessage({ type: "ready" });
      return instance;
    })().catch((err) => {
      pyodidePromise = null;
      throw err;
    });
  }
  return pyodidePromise;
}

/* ------------------------------------------------------------------ */
/* Execution                                                           */
/* ------------------------------------------------------------------ */

const readBuffers = (pyodide: PyodideInterface) => {
  try {
    const stdout = String(pyodide.runPython("__cursive_stdout.getvalue()") ?? "");
    const stderr = String(pyodide.runPython("__cursive_stderr.getvalue()") ?? "");
    return { stdout, stderr };
  } catch {
    return { stdout: "", stderr: "" };
  }
};

const restoreStreams = async (pyodide: PyodideInterface) => {
  try {
    await pyodide.runPythonAsync(
      "import sys\nsys.stdout = sys.__stdout__\nsys.stderr = sys.__stderr__\n"
    );
  } catch {
    /* ignore */
  }
};

async function executeRun(
  pyodide: PyodideInterface,
  runId: number,
  code: string,
  lines: string[]
): Promise<void> {
  currentRunId = runId;
  activePrompt = "";
  stdinLines = lines;
  stdinIndex = 0;

  // Applied on every run with a freshly split list and reset counter.
  pyodide.setStdin({
    stdin: () => {
      // Two attempts: a transient failure must not kill the program. If both
      // fail, surface the REAL error into the run's stderr and return EOF —
      // otherwise Pyodide swallows the exception and reports only the opaque
      // "OSError: [Errno 29] I/O error" with the cause hidden in console.
      for (let attempt = 1; ; attempt++) {
        try {
          // Step 1: pre-filled lines from the stdin box, in order.
          if (stdinIndex < stdinLines.length) {
            activePrompt = "";
            return stdinLines[stdinIndex++];
          }
          // Step 2: ask the user inline — never return null on the happy
          // path (that is EOF and would raise
          // "EOFError: EOF when reading a line").
          const prompt = activePrompt;
          activePrompt = "";
          workerScope.postMessage({ type: "input-request", runId, prompt });
          return waitForLine();
        } catch (err) {
          console.error(`Cursive stdin handler error (attempt ${attempt}):`, err);
          if (attempt >= 2) {
            const detail =
              err instanceof Error ? `${err.name}: ${err.message}` : String(err);
            try {
              workerScope.postMessage({
                type: "output",
                runId,
                text: `stdin error: ${detail}\n`,
                isError: true,
              });
            } catch {
              /* ignore */
            }
            return null; // EOF — end the program with the true cause visible
          }
        }
      }
    },
  });

  // Redirect stdout/stderr into in-memory buffers that also stream chunks to
  // the main thread (live terminal transcript), and wrap builtins.input so
  // the prompt text reaches this worker's stdin handler and every answer is
  // echoed into stdout like a real terminal session.
  await pyodide.runPythonAsync(`
import sys, io, builtins
if "__cursive_on_stdout" not in globals():
    def __cursive_on_stdout(_text, _is_err):
        pass
# Module-level alias: a bare __name inside a class body would be mangled.
_cursive_emit = __cursive_on_stdout
class __cursive_Stream:
    def __init__(self, buf, is_err):
        self._buf = buf
        self._is_err = is_err
    def write(self, s):
        s = str(s)
        self._buf.write(s)
        try:
            _cursive_emit(s, self._is_err)
        except Exception:
            pass
        return len(s)
    def flush(self):
        pass
    def isatty(self):
        return False
    def getvalue(self):
        return self._buf.getvalue()
__cursive_stdout = __cursive_Stream(io.StringIO(), False)
__cursive_stderr = __cursive_Stream(io.StringIO(), True)
sys.stdout = __cursive_stdout
sys.stderr = __cursive_stderr
if "__cursive_set_prompt" not in globals():
    def __cursive_set_prompt(_prompt):
        pass
if not hasattr(builtins, "__cursive_real_input"):
    builtins.__cursive_real_input = builtins.input
def __cursive_input(prompt=""):
    __cursive_set_prompt("" if prompt is None else str(prompt))
    line = builtins.__cursive_real_input(prompt)
    __cursive_stdout.write(str(line) + "\\n")
    return line
builtins.input = __cursive_input
`);

  try {
    await pyodide.runPythonAsync(code);
    const { stdout, stderr } = readBuffers(pyodide);
    workerScope.postMessage({ type: "done", runId, stdout, stderr, exitCode: 0 });
  } catch (err: unknown) {
    const { stdout, stderr } = readBuffers(pyodide);
    const message = err instanceof Error ? err.message : String(err);
    workerScope.postMessage({
      type: "done",
      runId,
      stdout,
      stderr: (stderr ? stderr + "\n" : "") + message,
      exitCode: 1,
    });
  } finally {
    await restoreStreams(pyodide);
  }
}

let runChain: Promise<void> = Promise.resolve();

workerScope.onmessage = (ev: MessageEvent<MainToWorker>) => {
  const msg = ev.data;
  if (msg.type === "attach") {
    meta = new Int32Array(msg.sab, 0, META_WORDS);
    payload = new Uint8Array(msg.sab, DATA_OFFSET);
    // Kick off the Pyodide download immediately so the first Run is fast.
    loadPyodideRuntime().catch((err) => {
      console.error("Pyodide failed to load in worker:", err);
    });
    return;
  }
  if (msg.type === "run") {
    // Serialise runs: one Python program at a time.
    runChain = runChain
      .then(async () => {
        const pyodide = await loadPyodideRuntime();
        workerScope.postMessage({ type: "started", runId: msg.runId });
        await executeRun(pyodide, msg.runId, msg.code, msg.stdinLines);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        workerScope.postMessage({ type: "error", runId: msg.runId, message });
      });
  }
};
