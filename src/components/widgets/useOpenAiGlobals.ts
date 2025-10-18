import { useSyncExternalStore } from "react";
import "./openaiBridge";
import type { OpenAiGlobals } from "./types";

const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";

type GlobalsStore = {
  getSnapshot: () => Partial<OpenAiGlobals>;
  subscribe: (listener: () => void) => () => void;
};

const globalsStore: GlobalsStore = (() => {
  let currentGlobals: Partial<OpenAiGlobals> = readGlobals();
  let initialized = false;

  const listeners = new Set<() => void>();

  function setGlobals(next: Partial<OpenAiGlobals>) {
    currentGlobals = { ...currentGlobals, ...next };
    listeners.forEach((listener) => listener());
  }

  function handleEvent(event: Event) {
    const custom = event as CustomEvent<{ globals: Partial<OpenAiGlobals> }>;
    if (custom.detail?.globals) {
      setGlobals(custom.detail.globals);
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleEvent as EventListener);
    
    // 延迟初始化：等待 window.openai 准备好
    const checkAndInit = () => {
      if (!initialized) {
        const fresh = readGlobals();
        if (fresh.toolOutput !== undefined) {
          console.log("✅ window.openai.toolOutput detected, initializing globals");
          currentGlobals = fresh;
          initialized = true;
          listeners.forEach((listener) => listener());
        }
      }
    };

    // 立即检查一次
    setTimeout(checkAndInit, 0);
    
    // 定期检查（最多5秒）
    const intervalId = setInterval(checkAndInit, 100);
    setTimeout(() => {
      clearInterval(intervalId);
      if (!initialized) {
        console.warn("⚠️ window.openai.toolOutput not detected after 5 seconds");
      }
    }, 5000);
  }

  return {
    getSnapshot: () => currentGlobals,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      // 新订阅者加入时，如果还没初始化，尝试重新读取
      if (typeof window !== "undefined" && !initialized) {
        const fresh = readGlobals();
        if (fresh.toolOutput !== undefined) {
          currentGlobals = fresh;
          initialized = true;
        }
      }
      return () => listeners.delete(listener);
    },
  };
})();

export function useOpenAiGlobals(): Partial<OpenAiGlobals> {
  return useSyncExternalStore(globalsStore.subscribe, globalsStore.getSnapshot);
}

export function useToolOutput<T>(fallback: T): T {
  const globals = useOpenAiGlobals();
  let toolOutput = globals.toolOutput as T | undefined;

  // If not found in globals, try window.openai.toolOutput
  if (!toolOutput && typeof window !== "undefined") {
    const windowOpenAi = (window as typeof window & { openai?: { toolOutput?: T } }).openai;
    toolOutput = windowOpenAi?.toolOutput as T | undefined;
    
    // Debug logging
    console.log("useToolOutput - globals.toolOutput:", globals.toolOutput);
    console.log("useToolOutput - window.openai.toolOutput:", windowOpenAi?.toolOutput);
    console.log("useToolOutput - resolved toolOutput:", toolOutput);
    console.log("useToolOutput - fallback:", fallback);
  }

  return toolOutput ?? fallback;
}

function readGlobals(): Partial<OpenAiGlobals> {
  if (typeof window === "undefined") {
    return {};
  }

  const openaiGlobals = (window as typeof window & {
    openai?: { toolOutput?: unknown; displayMode?: string; theme?: string; locale?: string };
  }).openai;

  const globals = {
    toolOutput: openaiGlobals?.toolOutput,
    displayMode: openaiGlobals?.displayMode as "inline" | "fullscreen" | "pip" | undefined,
    theme: openaiGlobals?.theme as "light" | "dark" | undefined,
    locale: openaiGlobals?.locale,
  };

  console.log("readGlobals called, result:", globals);

  return globals;
}
