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
  }

  return {
    getSnapshot: () => currentGlobals,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
})();

export function useOpenAiGlobals(): Partial<OpenAiGlobals> {
  return useSyncExternalStore(globalsStore.subscribe, globalsStore.getSnapshot);
}

export function useToolOutput<T>(fallback: T): T {
  const globals = useOpenAiGlobals();
  const toolOutput = globals.toolOutput as T | undefined;

  return toolOutput ?? (typeof window !== "undefined"
    ? ((window as typeof window & { openai?: { toolOutput?: T } }).openai?.toolOutput as T | undefined) ?? fallback
    : fallback);
}

function readGlobals(): Partial<OpenAiGlobals> {
  if (typeof window === "undefined") {
    return {};
  }

  const openaiGlobals = (window as typeof window & {
    openai?: { toolOutput?: unknown; displayMode?: string; theme?: string; locale?: string };
  }).openai;

  return {
    toolOutput: openaiGlobals?.toolOutput,
  };
}
