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
        apiKey: process.env.OPENROUTER_API_KEY,
        headers: {
          "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_APP_NAME ?? "Next.js Chatbot",
        },
      });

      return customProvider({
        languageModels: {
          // Chat model
          "chat-model": openrouter.languageModel("openai/gpt-5-chat"),

          // Reasoning-capable model (example slug; ensure availability on OpenRouter)
          "chat-model-reasoning": wrapLanguageModel({
            model: openrouter.languageModel("google/gemini-2.5-pro"),
            middleware: extractReasoningMiddleware({ tagName: "think" }),
          }),

          // Utility models
          "title-model": openrouter.languageModel("openai/gpt-5-chat"),
          "artifact-model": openrouter.languageModel("openai/gpt-5-chat"),
        },
      });
    })();
