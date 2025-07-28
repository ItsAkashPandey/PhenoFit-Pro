// Service configuration for AI models
interface ModelOption {
    id: string;
    name: string;
    contextWindow: number;
    description: string;
}

export enum OpenRouterModel {
    DEEPSEEK_CHAT = 'deepseek/deepseek-chat',
    QWEN_CODER = 'qwen/qwen-2.5-coder-32b-instruct',
    DEEPSEEK_R1 = 'deepseek/deepseek-r1',
    MISTRAL_7B_INSTRUCT = 'mistralai/mistral-7b-instruct'
}

export enum ApiService {
    OPENROUTER = 'openrouter'
}

export const AVAILABLE_MODELS: ModelOption[] = [
    {
        id: OpenRouterModel.DEEPSEEK_CHAT,
        name: "DeepSeek Chat v3",
        contextWindow: 32768,
        description: "Latest DeepSeek model with strong instruction following capabilities"
    },
    {
        id: OpenRouterModel.QWEN_CODER,
        name: "Qwen3 Coder",
        contextWindow: 262144,
        description: "Advanced model with large context window and code understanding"
    },
    {
        id: OpenRouterModel.DEEPSEEK_R1,
        name: "DeepSeek R1",
        contextWindow: 163840,
        description: "Balanced model with good performance and large context window"
    },
    {
        id: OpenRouterModel.MISTRAL_7B_INSTRUCT,
        name: "Mistral 7B Instruct",
        contextWindow: 32768,
        description: "Lightweight but capable instruction-following model"
    }
];

export const DEFAULT_MODEL = OpenRouterModel.DEEPSEEK_CHAT;

export const getModelConfig = (modelId: string = DEFAULT_MODEL) => {
    return {
        service: ApiService.OPENROUTER,
        modelName: modelId,
        contextWindow: AVAILABLE_MODELS.find(m => m.id === modelId)?.contextWindow || 32768
    };
};

export const isModelAvailable = (modelId: string): boolean => {
    return AVAILABLE_MODELS.some(m => m.id === modelId);
};

export const getModelInfo = (modelId: string): ModelOption | undefined => {
    return AVAILABLE_MODELS.find(m => m.id === modelId);
};
