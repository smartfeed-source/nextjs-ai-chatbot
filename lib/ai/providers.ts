import { createOpenAI } from "@ai-sdk/openai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

// Middleware to flatten text-only array content for OpenRouter compatibility
const openRouterMiddleware = {
  transformParams: async ({ params }: { params: any }) => {
    const newPrompt = params.prompt.map((message: any) => {
      // Only modify user, assistant, and system messages
      if (
        ["user", "assistant", "system"].includes(message.role) &&
        Array.isArray(message.content)
      ) {
        // Check if all parts are text
        const isAllText = message.content.every(
          (part: any) => part.type === "text"
        );
        
        if (isAllText) {
          return {
            ...message,
            content: message.content
              .map((part: any) => part.text)
              .join(""),
          };
        }
      }
      return message;
    });
    return { ...params, prompt: newPrompt };
  },
};

const createProdProvider = () => {
  const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  return customProvider({
    languageModels: {
      // Wrapped with middleware to fix "expected string, received array" errors
      "chat-model": wrapLanguageModel({
        model: openrouter("google/gemini-3-pro-preview"),
        middleware: openRouterMiddleware,
      }),
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
