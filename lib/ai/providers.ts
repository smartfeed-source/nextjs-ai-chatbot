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

          if (body && body.messages && Array.isArray(body.messages)) {
            
            // Transformation Logic
            body.messages = body.messages.map((msg: any) => {
              // 1. Handle Array Content (flatten text parts) for ALL roles
              if (Array.isArray(msg.content)) {
                const isAllText = msg.content.every(
                  (part: any) => part.type === "text"
                );
                if (isAllText) {
                  msg.content = msg.content
                    .map((part: any) => part.text)
                    .join("");
                }
              }

              // 2. Handle Tool Messages: Ensure content is a string (not an array)
              // Vercel AI SDK might treat tool result content as array if multimodal, 
              // but OpenAI/OpenRouter usually expects string for tool role.
              if (msg.role === "tool" && Array.isArray(msg.content)) {
                 const isAllText = msg.content.every(
                  (part: any) => part.type === "text"
                );
                 if (isAllText) {
                    msg.content = msg.content.map((part: any) => part.text).join("");
                 } else {
                    // Fallback for non-text tool content? 
                    // Usually tool results are text (JSON). 
                    // If there's an image, it's tricky, but for now assume text.
                    msg.content = JSON.stringify(msg.content);
                 }
              }

              // 3. Ensure Assistant messages with tool_calls have content (some providers require it)
              if (msg.role === "assistant" && msg.tool_calls && (msg.content === null || msg.content === undefined)) {
                // Some providers fail if content is null. Set to empty string or leave as is depending on strictness.
                // OpenRouter/Gemini often prefers existing content field.
                // We'll leave it as null if it works, but if logs show error "content required", we set it to "".
                // msg.content = ""; 
              }
              
              return msg;
            });
            
            // Update the body string
            init.body = JSON.stringify(body);

            // Log the OUTGOING messages payload (safely truncated) AFTER transformation
             console.log(
              "[OpenRouter] Outgoing Messages Payload (Optimized):",
              JSON.stringify(body.messages, (key, value) => {
                 if (key === "content" && typeof value === "string" && value.length > 100) {
                   return value.substring(0, 100) + "... (truncated)";
                 }
                 return value;
              }, 2)
            );
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
