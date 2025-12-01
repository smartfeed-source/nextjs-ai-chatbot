export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Gemini 2.0 Flash",
    description: "Fast and capable multimodal model from Google via OpenRouter",
  },
  {
    id: "chat-model-reasoning",
    name: "Gemini 2.0 Flash Thinking",
    description:
      "Reasoning model with chain-of-thought capabilities",
  },
];
