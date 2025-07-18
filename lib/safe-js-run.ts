"use client";
// Core JavaScript execution engine with security sandbox

import { safe } from "ts-safe";

type LogEntry = {
  type: "log" | "info" | "warn" | "error" | "debug" | "trace";
  args: any[];
};

type SafeRunOptions = {
  code: string;
  input?: Record<string, any>;
  timeout?: number;
  onLog?: (entry: LogEntry) => void;
};

export type SafeJsExecutionResult = {
  success: boolean;
  logs: LogEntry[];
  error?: string;
  executionTime: number;
};

// Security: Block dangerous keywords that could compromise sandbox
const FORBIDDEN_KEYWORDS = [
  // DOM and browser globals
  "document.",
  "globalThis.",
  "self.",
  "window",
  "frames",
  "opener",
  // Code execution (but not function declarations)
  "eval",
  "constructor",
  "prototype",
  "__proto__",
  // Node.js environment
  "process.",
  "require",
  "exports",
  // Dangerous objects
  "Worker",
  "SharedWorker",
  "ServiceWorker",
  "MessageChannel",
  // Network bypass attempts
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
];

// Enhanced security check with pattern detection
function validateCodeSafety(code: string): string | null {
  // Check forbidden keywords
  for (const keyword of FORBIDDEN_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`);
    if (regex.test(code)) {
      return `Forbidden keyword: '${keyword}' - not allowed for security reasons`;
    }
  }

  // Detect obvious infinite loop patterns that would block the event loop
  const infiniteLoopPatterns = [
    {
      pattern: /while\s*\(\s*true\s*\)/,
      message: "Infinite while loop detected",
    },
    {
      pattern: /for\s*\(\s*;\s*;\s*\)/,
      message: "Infinite for loop detected",
    },
    {
      pattern: /while\s*\(\s*1\s*\)/,
      message: "Infinite while loop detected",
    },
    {
      pattern: /for\s*\(\s*;\s*true\s*;\s*\)/,
      message: "Infinite for loop detected",
    },
  ];

  for (const { pattern, message } of infiniteLoopPatterns) {
    if (pattern.test(code)) {
      return `Dangerous infinite loop pattern: ${message}`;
    }
  }

  // Detect suspicious patterns that might bypass security
  const suspiciousPatterns = [
    {
      pattern: /['"`]\s*\+\s*['"`]/g,
      message: "String concatenation to access globals",
    },
    {
      pattern: /\[['"`][a-zA-Z_$][a-zA-Z0-9_$]*['"`]\]/g,
      message: "Dynamic property access",
    },
    { pattern: /eval\s*\(/, message: "Dynamic code evaluation" },
    { pattern: /(new\s+)?Function\s*\(/, message: "Function constructor" },
    { pattern: /constructor\s*\(/, message: "Constructor access" },
    { pattern: /prototype\s*\[/, message: "Prototype manipulation" },
    {
      pattern: /(__proto__|\.constructor)/,
      message: "Prototype chain access",
    },
  ];

  for (const { pattern, message } of suspiciousPatterns) {
    if (pattern.test(code)) {
      return `Suspicious pattern detected: ${message}`;
    }
  }

  return null;
}

// Create a controlled execution environment with safe APIs
function createSafeEnvironment(
  input: Record<string, any>,
  logCapture: (type: LogEntry["type"], ...args: any[]) => void,
) {
  const safeConsole = {
    log: (...args: any[]) => logCapture("log", ...args),
    info: (...args: any[]) => logCapture("info", ...args),
    warn: (...args: any[]) => logCapture("warn", ...args),
    error: (...args: any[]) => logCapture("error", ...args),
    debug: (...args: any[]) => logCapture("debug", ...args),
    trace: (...args: any[]) => logCapture("trace", ...args),
  };

  // Safe global objects and functions
  const safeGlobals = {
    // Input data
    ...input,

    // Console for output
    console: safeConsole,

    // Standard JavaScript objects
    Math: Math,
    JSON: JSON,
    Date: Date,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    RegExp: RegExp,
    Promise: Promise,

    // Utility functions
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    isFinite: isFinite,
    encodeURIComponent: encodeURIComponent,
    decodeURIComponent: decodeURIComponent,

    // Safe browser APIs (if available)
    ...(typeof self !== "undefined" && {
      fetch: self.fetch.bind(self),
      setTimeout: self.setTimeout.bind(self),
      setInterval: self.setInterval.bind(self),
      clearTimeout: self.clearTimeout.bind(self),
      clearInterval: self.clearInterval.bind(self),
      btoa: self.btoa.bind(self),
      atob: self.atob.bind(self),
    }),
  };

  return { safeGlobals };
}

// Simple code wrapper - no complex result detection needed
function wrapCode(code: string): string {
  return `"use strict";\n${code}`;
}

async function execute({
  code,
  input = {},
  timeout = 5000,
  onLog,
}: SafeRunOptions): Promise<SafeJsExecutionResult> {
  const startTime = Date.now();
  const logs: LogEntry[] = [];

  // Capture logs
  const logCapture = (type: LogEntry["type"], ...args: any[]) => {
    const entry: LogEntry = { type, args };
    logs.push(entry);
    const length = JSON.stringify(logs).length;
    if (length > 10000) {
      throw new Error(`Logs limit exceeded ${length} characters`);
    }
    if (onLog) onLog(entry);
  };

  // Validate code safety
  const securityError = validateCodeSafety(code);
  if (securityError) {
    return {
      success: false,
      error: securityError,
      logs,
      executionTime: Date.now() - startTime,
    };
  }

  // Create safe execution environment
  const { safeGlobals } = createSafeEnvironment(input, logCapture);
  const wrappedCode = wrapCode(code);

  // Execute with timeout protection
  try {
    await Promise.race([
      // Code execution
      new Promise((resolve, reject) => {
        try {
          const func = new Function(...Object.keys(safeGlobals), wrappedCode);
          func(...Object.values(safeGlobals));
          resolve(undefined);
        } catch (error: any) {
          reject(error);
        }
      }),

      // Timeout
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Execution timeout: ${timeout}ms limit exceeded`));
        }, timeout);
      }),
    ]);

    return {
      success: true,
      logs,
      executionTime: Date.now() - startTime,
    };
  } catch (error: any) {
    logs.push({
      type: "error",
      args: [error],
    });
    return {
      success: false,
      error: error.message || "Unknown execution error",
      logs,
      executionTime: Date.now() - startTime,
    };
  }
}

export async function safeJsRun(
  code: string,
  input: Record<string, unknown>,
  timeout: number = 5000,
  onLog?: (entry: LogEntry) => void,
) {
  return safe(async () => {
    const result = await execute({
      code,
      input,
      timeout,
      onLog,
    });

    if (!result.success) {
      throw new Error(result.error || "Code execution failed");
    }

    return {
      logs: result.logs,
      executionTime: `${result.executionTime}ms`,
      success: true,
    };
  })
    .ifFail((err) => {
      return {
        isError: true,
        error: err.message,
        solution: `JavaScript execution failed. Common issues:
    • Syntax errors: Check for missing semicolons, brackets, or quotes
    • Forbidden operations: Avoid DOM access, eval(), or global object manipulation  
    • Infinite loops: Code execution times out after ${timeout}ms
    • API errors: Check network connectivity for fetch() calls
    • Type errors: Verify data types and object properties exist
    • Reference errors: Make sure all variables and functions are defined
    
    Available APIs: Math, JSON, Date, fetch, setTimeout, console.log
    Input data properties are available as variables in your code scope.
    Use console.log() to output results and debug information.`,
      };
    })
    .unwrap();
}

export type { LogEntry };
