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
    fetch: async (input, init) => {
      try {
        // Only modify request body for chat completions
        const urlStr = input.toString();
        if (
          urlStr.includes("/chat/completions") &&
          init?.body &&
          typeof init.body === "string"
        ) {
          const body = JSON.parse(init.body);
          if (body.messages && Array.isArray(body.messages)) {
            body.messages = body.messages.map((msg: any) => {
              // OpenRouter/OpenAI format: content can be string or array
              // If it is an array of text parts, flatten it to a string
              if (Array.isArray(msg.content)) {
                const isAllText = msg.content.every(
                  (part: any) => part.type === "text"
                );
                if (isAllText) {
                  return {
                    ...msg,
                    content: msg.content
                      .map((part: any) => part.text)
                      .join(""),
                  };
                }
              }
              return msg;
            });
            init.body = JSON.stringify(body);
          }
        }
      } catch (e) {
        console.error("OpenRouter middleware error:", e);
      }
      return fetch(input, init);
    },
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
