export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Gemini 3.0 Pro",
    description: "Fully multimodal reasoning model from Google via OpenRouter",
  },
  {
    id: "chat-model-reasoning",
    name: "ChatGPT 5.1 Thinking",
    description:
      "Advanced reasoning model with thinking capabilities from OpenAI via OpenRouter",
  },
];
