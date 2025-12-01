import { createOpenAI } from "@ai-sdk/openai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

const createProdProvider = () => {
  const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  return customProvider({
    languageModels: {
      "chat-model": openrouter("google/gemini-3-pro-preview"),
      "chat-model-reasoning": wrapLanguageModel({
        model: openrouter("openai/gpt-5.1-thinking"),
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      }),
      "title-model": openrouter("google/gemini-3-pro-preview"),
      "artifact-model": openrouter("google/gemini-3-pro-preview"),
    },
  });
};

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
  : createProdProvider();
