/**
 * Message protocol + SharedArrayBuffer layout shared between the main thread
 * (pyodide-worker-client.ts) and the Web Worker (pyodide-worker.ts).
 *
 * stdin flow:
 *   1. pre-filled lines from the console's stdin box are sent with the run
 *      message and handed out first;
 *   2. when they run out the worker posts an "input-request" and blocks on
 *      Atomics.wait() against the SharedArrayBuffer below, so Python's
 *      synchronous input() keeps working while the user types inline in the
 *      terminal panel. The main thread writes the answer into the buffer and
 *      notifies the worker.
 */

/** Total size of the shared stdin buffer (bytes). */
export const SAB_SIZE = 64 * 1024;
/** Int32 meta slots: [0] = state, [1] = byte length of the pending line. */
export const META_WORDS = 2;
/** Byte offset of the UTF-8 line payload (aligned after the meta words). */
export const DATA_OFFSET = META_WORDS * Int32Array.BYTES_PER_ELEMENT; // 8
/** Max UTF-8 bytes for one input line (leaves room after the meta header). */
export const MAX_LINE_BYTES = SAB_SIZE - DATA_OFFSET;

/** Worker is waiting for the main thread to provide a line. */
export const STATE_WAITING = 0;
/** Main thread has written a line into the payload area. */
export const STATE_LINE_READY = 1;

export type MainToWorker =
  | { type: "attach"; sab: SharedArrayBuffer }
  | { type: "run"; runId: number; code: string; stdinLines: string[] };

export type WorkerToMain =
  | { type: "ready" }
  | { type: "started"; runId: number }
  | { type: "output"; runId: number; text: string; isError: boolean }
  | { type: "input-request"; runId: number; prompt: string }
  | { type: "done"; runId: number; stdout: string; stderr: string; exitCode: number }
  | { type: "error"; runId: number; message: string };
