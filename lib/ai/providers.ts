import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

const OPENROUTER_CHAT_COMPLETIONS_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const truncate = (value: string, length = 500) => {
  if (value.length <= length) {
    return value;
  }
  return `${value.slice(0, length)}…`;
};

const extractContentPreview = (content: unknown): string => {
  if (typeof content === "string") {
    return truncate(content);
  }

  if (Array.isArray(content)) {
    return truncate(
      content
        .map((part) => {
          if (typeof part === "string") {
            return part;
          }
          if (part && typeof part === "object" && "type" in part) {
            const typedPart = part as { type?: string; text?: string };
            if (typedPart.type === "text" && typedPart.text) {
              return typedPart.text;
            }
            return `[${typedPart.type ?? "unknown"}]`;
          }
          return "[unknown]";
        })
        .join(" ")
    );
  }

  if (content && typeof content === "object") {
    return "[structured-content]";
  }

  return "";
};

const logRequestPayload = (modelId: string, params: any) => {
  try {
    console.log("[OpenRouter] URL:", OPENROUTER_CHAT_COMPLETIONS_URL);
    console.log("[OpenRouter] Model:", modelId);
    console.log(
      "[OpenRouter] Payload:",
      JSON.stringify(
        {
          maxOutputTokens: params?.maxOutputTokens,
          temperature: params?.temperature,
          stopSequences: params?.stopSequences,
          prompt: (params?.prompt ?? []).map((message: any) => ({
            role: message.role,
            content: extractContentPreview(message.content),
          })),
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error("[OpenRouter] Failed to log payload", error);
  }
};

const createLoggedModel = (
  openrouter: ReturnType<typeof createOpenRouter>,
  modelId: string
) =>
  wrapLanguageModel({
    model: openrouter.chat(modelId),
    middleware: {
      transformParams: async ({ params }) => {
        logRequestPayload(modelId, params);
        return params;
      },
    },
  });

const createProdProvider = () => {
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
    fetch: async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : "url" in input
              ? input.url
              : OPENROUTER_CHAT_COMPLETIONS_URL;

      // Inject include_reasoning: true into the body for Gemini/OpenRouter compatibility
      if (init?.body && typeof init.body === "string") {
        try {
          const parsedBody = JSON.parse(init.body);
          parsedBody.include_reasoning = true;
          init.body = JSON.stringify(parsedBody);
        } catch (e) {
          console.warn("[OpenRouter] Failed to inject include_reasoning:", e);
        }
      }

      try {
        console.log("[OpenRouter] Request URL:", url);
        if (init?.body && typeof init.body === "string") {
          const parsedBody = JSON.parse(init.body);
          console.log(
            "[OpenRouter] Request Payload:",
            JSON.stringify(
              parsedBody,
              (key, value) => {
                if (
                  typeof value === "string" &&
                  value.length > 120 &&
                  (key === "content" || key === "input")
                ) {
                  return `${value.slice(0, 120)}... (truncated)`;
                }
                return value;
              },
              2
            )
          );
        }
      } catch (logError) {
        console.warn("[OpenRouter] Failed to log request payload:", logError);
      }

      const response = await fetch(input, init);
      console.log("[OpenRouter] Response status:", response.status);
      if (!response.ok) {
        try {
          const cloned = response.clone();
          console.error("[OpenRouter] Error response:", await cloned.text());
        } catch (cloneError) {
          console.error(
            "[OpenRouter] Failed to read error response:",
            cloneError
          );
        }
      }
      return response;
    },
  });

  return customProvider({
    languageModels: {
      "chat-model": createLoggedModel(
        openrouter,
        "google/gemini-3-pro-preview"
      ),
      "chat-model-reasoning": wrapLanguageModel({
        model: createLoggedModel(openrouter, "openai/gpt-5.1"),
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      }),
      "title-model": createLoggedModel(
        openrouter,
        "google/gemini-3-pro-preview"
      ),
      "artifact-model": createLoggedModel(
        openrouter,
        "google/gemini-3-pro-preview"
      ),
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
