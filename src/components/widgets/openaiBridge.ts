export type RequestDisplayModeArgs = {
  mode: "inline" | "fullscreen" | "pip";
};

declare global {
  interface Window {
    openai?: {
      toolOutput?: unknown;
      callTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
      requestDisplayMode?: (args: RequestDisplayModeArgs) => Promise<{ mode: string }>;
    };
  }
}

export {}; // ensure this file is treated as a module
