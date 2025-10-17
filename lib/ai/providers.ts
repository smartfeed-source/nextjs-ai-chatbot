import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { openai } from "@ai-sdk/openai";
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
  : customProvider({
      languageModels: {
        // OpenRouter via OpenAI-compatible provider
        // Set OPENROUTER_API_KEY, OPENROUTER_SITE_URL, OPENROUTER_APP_NAME
        "chat-model": openai({
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: process.env.OPENROUTER_API_KEY,
          headers: {
            "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
            "X-Title": process.env.OPENROUTER_APP_NAME ?? "Next.js Chatbot",
          },
        }).languageModel("openai/gpt-5-chat"),
        "chat-model-reasoning": wrapLanguageModel({
          model: openai({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
            headers: {
              "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
              "X-Title": process.env.OPENROUTER_APP_NAME ?? "Next.js Chatbot",
            },
          }).languageModel("google/gemini-2.5-pro"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "title-model": openai({
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: process.env.OPENROUTER_API_KEY,
          headers: {
            "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
            "X-Title": process.env.OPENROUTER_APP_NAME ?? "Next.js Chatbot",
          },
        }).languageModel("openai/gpt-4o-mini"),
        "artifact-model": openai({
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: process.env.OPENROUTER_API_KEY,
          headers: {
            "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
            "X-Title": process.env.OPENROUTER_APP_NAME ?? "Next.js Chatbot",
          },
        }).languageModel("openai/gpt-4o-mini"),
      },
    });
