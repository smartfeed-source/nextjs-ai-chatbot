import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { isTestEnvironment } from "../constants";

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
  : (() => {
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY ?? "",
      });

      return customProvider({
        languageModels: {
          // Chat model
          "chat-model": openrouter("openai/gpt-5-chat"),

          // Reasoning-capable model (example slug; ensure availability on OpenRouter)
          "chat-model-reasoning": wrapLanguageModel({
            model: openrouter("google/gemini-2.5-pro"),
            middleware: extractReasoningMiddleware({ tagName: "think" }),
          }),

          // Utility models
          "title-model": openrouter("openai/gpt-5-chat"),
          "artifact-model": openrouter("openai/gpt-5-chat"),
        },
      });
    })();
