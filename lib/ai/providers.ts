import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { isTestEnvironment } from "../constants";

const THINKING_SUFFIX_REGEX = /-thinking$/;

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : null;

/**
 * Map your existing modelId strings to real provider models.
 * IMPORTANT: keep these ids aligned with what your UI sends as selectedChatModel.
 */
function resolveModel(modelId: string) {
  // normalize "-thinking" suffix used in your app
  const normalized = modelId.replace(THINKING_SUFFIX_REGEX, "");

  // --- Anthropic (if your UI uses anthropic/... ids) ---
  if (normalized.startsWith("anthropic/")) {
    const name = normalized.replace("anthropic/", "");
    return anthropic(name);
  }

  // --- OpenAI (if your UI uses openai/... ids) ---
  if (normalized.startsWith("openai/")) {
    const name = normalized.replace("openai/", "");
    return openai(name);
  }

  /**
   * Fallback:
   * If your UI sends short ids like "gpt-4.1-mini" or "claude-3-5-sonnet-latest",
   * decide default provider here.
   */
  if (normalized.startsWith("gpt-")) {
    return openai(normalized);
  }

  // If you only use Anthropic for non-openai ids, keep it here:
  return anthropic(normalized);
}

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  const isReasoningModel =
    modelId.includes("reasoning") || modelId.endsWith("-thinking");

  if (isReasoningModel) {
    // remove "-thinking" suffix for actual model name
    const baseId = modelId.replace(THINKING_SUFFIX_REGEX, "");

    return wrapLanguageModel({
      model: resolveModel(baseId),
      middleware: extractReasoningMiddleware({ tagName: "thinking" }),
    });
  }

  return resolveModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }

  // Keep same behavior as before: use a small/cheap model for titles
  // Change this if you prefer OpenAI for titles:
  return anthropic("claude-3-5-haiku-latest");
}

export function getArtifactModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("artifact-model");
  }

  // Artifacts can be heavier; pick what you want.
  return anthropic("claude-3-5-haiku-latest");
}
