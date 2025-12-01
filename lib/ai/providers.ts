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
        const urlStr = input.toString();
        console.log(`[OpenRouter] Request URL: ${urlStr}`);

        if (urlStr.includes("/chat/completions") && init?.body) {
          let body;
          if (typeof init.body === "string") {
             body = JSON.parse(init.body);
          } else {
             // Handle other body types if necessary, but fetch usually receives stringified JSON
             console.log("[OpenRouter] Request body is not a string:", init.body);
          }

          if (body) {
            // Log the OUTGOING messages structure (safely truncated)
             console.log(
              "[OpenRouter] Outgoing Messages Payload:",
              JSON.stringify(body.messages, (key, value) => {
                 if (key === "content" && typeof value === "string" && value.length > 100) {
                   return value.substring(0, 100) + "... (truncated)";
                 }
                 return value;
              }, 2)
            );

            if (body.messages && Array.isArray(body.messages)) {
              body.messages = body.messages.map((msg: any) => {
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
               console.log("[OpenRouter] Transformed body successfully.");
            }
          }
        }
      } catch (e) {
        console.error("[OpenRouter] Middleware error:", e);
      }

      const response = await fetch(input, init);
      
      // Log response status and basic info
      console.log(`[OpenRouter] Response status: ${response.status}`);
      if (!response.ok) {
          // Clone response to read body for error logging without consuming the stream
          const errorClone = response.clone();
          try {
              const errorText = await errorClone.text();
              console.error(`[OpenRouter] Error response body: ${errorText}`);
          } catch (err) {
              console.error("[OpenRouter] Failed to read error response body", err);
          }
      }

      return response;
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
