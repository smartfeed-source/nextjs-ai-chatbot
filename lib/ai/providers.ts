import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
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
      const openrouter = createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY ?? "",
      });

      return customProvider({
        languageModels: {
          // Chat model - use .chat() method for proper v2 model
          "chat-model": openrouter.chat("openai/gpt-5-chat"),

          // Reasoning-capable model
          "chat-model-reasoning": wrapLanguageModel({
            model: openrouter.chat("google/gemini-2.5-pro"),
            middleware: extractReasoningMiddleware({ tagName: "think" }),
          }),

          // Utility models
          "title-model": openrouter.chat("openai/gpt-5-chat"),
          "artifact-model": openrouter.chat("openai/gpt-5-chat"),
        },
      });
    })();
