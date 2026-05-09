/**
 * Toonflow vendor adapter for AtlasCloud MASS.
 * Toonflow 的 AtlasCloud MASS 供应商适配器。
 *
 * Overview / 概览:
 * 1. Text models use the OpenAI-compatible base URL.
 *    文本模型走 OpenAI 兼容接口。
 * 2. Image and video models use AtlasCloud media endpoints.
 *    图片与视频模型走 AtlasCloud 媒体接口。
 * 3. Media generation is usually asynchronous and requires polling.
 *    媒体生成通常是异步任务，需要轮询查询结果。
 */

// ============================================================
// Type Definitions / 类型定义
// ============================================================

type VideoMode =
  | "singleImage"
  | "startEndRequired"
  | "endFrameOptional"
  | "startFrameOptional"
  | "text"
  | (`videoReference:${number}` | `imageReference:${number}` | `audioReference:${number}`)[];

interface TextModel {
  name: string;
  modelName: string;
  type: "text";
  think: boolean;
}

// Image generation model metadata.
// 图片模型元信息。
interface ImageModel {
  name: string;
  modelName: string;
  type: "image";
  mode: ("text" | "singleImage" | "multiReference")[];
  associationSkills?: string;
}

// Video generation model metadata.
// 视频模型元信息。
interface VideoModel {
  name: string;
  modelName: string;
  type: "video";
  mode: VideoMode[];
  associationSkills?: string;
  audio: "optional" | false | true;
  durationResolutionMap: { duration: number[]; resolution: string[] }[];
}

// Text-to-speech model metadata.
// 文本转语音模型元信息。
interface TTSModel {
  name: string;
  modelName: string;
  type: "tts";
  voices: { title: string; voice: string }[];
}

// Vendor configuration exported to Toonflow.
// 暴露给 Toonflow 的供应商配置。
interface VendorConfig {
  id: string;
  version: string;
  name: string;
  author: string;
  description?: string;
  icon?: string;
  inputs: { key: string; label: string; type: "text" | "password" | "url"; required: boolean; placeholder?: string; disabled?: boolean }[];
  inputValues: Record<string, string>;
  models: (TextModel | ImageModel | VideoModel | TTSModel)[];
}

// Base64 references accepted by the media endpoints.
// 媒体接口支持的 Base64 参考输入。
type ReferenceList =
  | { type: "image"; sourceType: "base64"; base64: string }
  | { type: "audio"; sourceType: "base64"; base64: string }
  | { type: "video"; sourceType: "base64"; base64: string };

interface ImageConfig {
  prompt: string;
  referenceList?: Extract<ReferenceList, { type: "image" }>[];
  size: "1K" | "2K" | "4K";
  aspectRatio: `${number}:${number}`;
}

// Runtime config passed from Toonflow video workflow.
// Toonflow 视频工作流传入的运行时配置。
interface VideoConfig {
  duration: number;
  resolution: string;
  aspectRatio: "16:9" | "9:16";
  prompt: string;
  referenceList?: ReferenceList[];
  audio?: boolean;
  mode: VideoMode[];
}

interface TTSConfig {
  text: string;
  voice: string;
  speechRate: number;
  pitchRate: number;
  volume: number;
  referenceList?: Extract<ReferenceList, { type: "audio" }>[];
}

interface PollResult {
  completed: boolean;
  data?: string;
  error?: string;
}

// ============================================================
// Global Declarations / 全局声明
// ============================================================

declare const axios: any;
declare const logger: (msg: string) => void;
declare const urlToBase64: (url: string) => Promise<string>;
declare const pollTask: (fn: () => Promise<PollResult>, interval?: number, timeout?: number) => Promise<PollResult>;
declare const createOpenAICompatible: any;
declare const exports: {
  vendor: VendorConfig;
  textRequest: (m: TextModel, t: boolean, tl: 0 | 1 | 2 | 3) => any;
  imageRequest: (c: ImageConfig, m: ImageModel) => Promise<string>;
  videoRequest: (c: VideoConfig, m: VideoModel) => Promise<string>;
  ttsRequest: (c: TTSConfig, m: TTSModel) => Promise<string>;
  checkForUpdates?: () => Promise<{ hasUpdate: boolean; latestVersion: string; notice: string }>;
  updateVendor?: () => Promise<string>;
};

// ============================================================
// Vendor Configuration / 供应商配置
// ============================================================

const vendor: VendorConfig = {
  id: "atlascloud",
  version: "1.0",
  author: "AtlasCloud",
  name: "AtlasCloud MASS",
  description:
    "Atlas Cloud 是一个全模态 AI 推理平台，开发者只需一个统一的 AI API，即可调用视频生成、图像生成和 LLM API。 Atlas Cloud is a full-modal AI inference platform that provides one unified AI API for video generation, image generation, and LLM access. https://www.atlascloud.ai/?utm_source=github&utm_medium=toonflow&utm_campaign=toonflow",
  inputs: [
    { key: "apiKey", label: "API密钥", type: "password", required: true, placeholder: "AtlasCloud API Key" },
    { key: "chatBaseUrl", label: "文本基地址", type: "url", required: true, placeholder: "https://api.atlascloud.ai/v1", disabled: true },
    { key: "mediaBaseUrl", label: "媒体基地址", type: "url", required: true, placeholder: "https://api.atlascloud.ai/api/v1", disabled: true },
  ],
  inputValues: {
    apiKey: "",
    chatBaseUrl: "https://api.atlascloud.ai/v1",
    mediaBaseUrl: "https://api.atlascloud.ai/api/v1",
  },
  models: [
    { name: "DeepSeek V4 Pro", modelName: "deepseek-ai/deepseek-v4-pro", type: "text", think: false },
    { name: "DeepSeek V4 Flash", modelName: "deepseek-ai/deepseek-v4-flash", type: "text", think: false },
    { name: "Kimi K2.6", modelName: "moonshotai/kimi-k2.6", type: "text", think: false },
    { name: "GLM 5.1", modelName: "zai-org/glm-5.1", type: "text", think: false },
    { name: "MiniMax M2.7", modelName: "minimaxai/minimax-m2.7", type: "text", think: false },
    { name: "GPT Image 2", modelName: "openai/gpt-image-2/text-to-image", type: "image", mode: ["text", "singleImage"] },
    { name: "Nano Banana Pro", modelName: "google/nano-banana-pro/text-to-image", type: "image", mode: ["text", "singleImage", "multiReference"] },
    { name: "Nano Banana 2", modelName: "google/nano-banana-2/text-to-image", type: "image", mode: ["text", "singleImage", "multiReference"] },
    { name: "Seedream v5", modelName: "bytedance/seedream-v5.0-lite/sequential", type: "image", mode: ["text"] },
    { name: "Qwen Image 2 Pro", modelName: "qwen/qwen-image-2.0-pro/text-to-image", type: "image", mode: ["text"] },
    {
      name: "Seedance 2.0 Audio-Visual",
      modelName: "bytedance/seedance-2.0/text-to-video",
      type: "video",
      mode: ["text", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]],
      audio: "optional",
      durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p"] }],
    },
    {
      name: "Seedance 2.0 Reference-to-Video",
      modelName: "bytedance/seedance-2.0/reference-to-video",
      type: "video",
      mode: ["singleImage"],
      audio: "optional",
      durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p", "1080p"] }],
    },
    {
      name: "Seedance 2.0 Multi-Image-to-Video",
      modelName: "bytedance/seedance-2.0/image-to-video",
      type: "video",
      mode: ["startFrameOptional", ["imageReference:4"]],
      audio: "optional",
      durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p", "1080p"] }],
    },
    {
      name: "Seedance 2.0 Fast Audio-Visual",
      modelName: "bytedance/seedance-2.0-fast/text-to-video",
      type: "video",
      mode: ["text", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]],
      audio: "optional",
      durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p"] }],
    },
    {
      name: "Seedance 2.0 Fast Reference-to-Video",
      modelName: "bytedance/seedance-2.0-fast/reference-to-video",
      type: "video",
      mode: ["singleImage"],
      audio: "optional",
      durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p"] }],
    },
    {
      name: "Wan-2.7 Reference-to-video",
      modelName: "alibaba/wan-2.7/reference-to-video",
      type: "video",
      mode: ["singleImage"],
      audio: "optional",
      durationResolutionMap: [{ duration: [2, 3, 4, 5, 6, 7, 8, 9, 10], resolution: ["720p", "1080p"] }],
    },
  ],
};

// ============================================================
// Utilities / 辅助工具
// ============================================================

const SUCCESS_STATUSES = ["succeeded", "success", "done", "completed"];
const FAILURE_STATUSES = ["failed", "error", "cancelled", "canceled", "expired"];

const getChatBaseUrl = () => vendor.inputValues.chatBaseUrl.replace(/\/+$/, "");

const getMediaBaseUrl = () => vendor.inputValues.mediaBaseUrl.replace(/\/+$/, "");

const joinUrl = (base: string, path: string) => `${base}${path.startsWith("/") ? "" : "/"}${path}`;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizeApiKey = (apiKey: string) => apiKey.replace(/^Bearer\s+/i, "");

const getHeaders = () => {
  if (!vendor.inputValues.apiKey) throw new Error("缺少 API Key");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${normalizeApiKey(vendor.inputValues.apiKey)}`,
  };
};

// Read nested values by a dotted path and optional array indexes such as data[0].url.
// 按路径读取嵌套值，同时支持 data[0].url 这种数组索引格式。
const readByPath = (obj: any, path: string): any => {
  if (!obj || !path) return undefined;
  const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1");
  return normalizedPath.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
};

// AtlasCloud task ids may appear in different fields depending on the endpoint.
// AtlasCloud 不同接口返回 task id 的字段可能不同，这里统一兼容。
const extractTaskId = (data: any): string | undefined => {
  return (
    readByPath(data, "id") ||
    readByPath(data, "taskId") ||
    readByPath(data, "task_id") ||
    readByPath(data, "data.id") ||
    readByPath(data, "data.taskId") ||
    readByPath(data, "data.task_id")
  );
};

// Media URLs can be returned in several response shapes.
// 结果地址可能出现在多种响应结构中，这里统一兜底提取。
const extractUrl = (data: any): string | undefined => {
  return (
    (Array.isArray(readByPath(data, "data.outputs")) ? readByPath(data, "data.outputs")[0] : undefined) ||
    (Array.isArray(readByPath(data, "outputs")) ? readByPath(data, "outputs")[0] : undefined) ||
    readByPath(data, "url") ||
    readByPath(data, "video_url") ||
    readByPath(data, "image_url") ||
    readByPath(data, "data.url") ||
    readByPath(data, "data.video_url") ||
    readByPath(data, "data.image_url") ||
    readByPath(data, "data.output.url") ||
    readByPath(data, "data.output.video_url") ||
    readByPath(data, "output.url")
  );
};

// Some image endpoints may return base64 directly instead of a URL.
// 部分图片接口会直接返回 base64，而不是可下载 URL。
const extractB64 = (data: any): string | undefined => {
  return (
    readByPath(data, "b64_json") ||
    readByPath(data, "data.b64_json") ||
    readByPath(data, "data[0].b64_json")
  );
};

// Normalize status to lower-case so polling logic can be shared.
// 将状态统一转为小写，方便轮询逻辑复用。
const extractStatus = (data: any): string => {
  const statusRaw =
    readByPath(data, "status") ||
    readByPath(data, "data.status") ||
    readByPath(data, "data.state") ||
    readByPath(data, "state");
  return String(statusRaw || "").toLowerCase();
};

// Extract the most useful error message from vendor responses.
// 从供应商响应中尽可能提取可读的报错信息。
const extractError = (data: any): string | undefined => {
  return (
    readByPath(data, "error.message") ||
    readByPath(data, "message") ||
    readByPath(data, "msg") ||
    readByPath(data, "data.error.message") ||
    readByPath(data, "data.message")
  );
};

// Retry only on transient DNS/network issues.
// 仅在临时 DNS/网络错误时重试。
const isDnsOrNetworkError = (err: any): boolean => {
  const msg = String(err?.message || err || "");
  return /ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT|timeout/i.test(msg);
};

// Simple linear backoff to reduce transient AtlasCloud network failures.
// 使用线性退避来降低临时网络波动带来的失败率。
const withNetworkRetry = async <T>(fn: () => Promise<T>, maxRetry = 3, waitMs = 1500): Promise<T> => {
  let lastErr: any;
  for (let i = 0; i < maxRetry; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isDnsOrNetworkError(err) || i === maxRetry - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, waitMs * (i + 1)));
    }
  }
  throw lastErr;
};

// AtlasCloud image edit models differ from plain text-to-image model names.
// AtlasCloud 图像编辑模型与普通文生图模型名称不同，这里做自动切换。
const resolveAtlasImageModelName = (modelName: string, hasImageRefs: boolean): string => {
  if (!hasImageRefs) return modelName;

  switch (modelName) {
    case "google/nano-banana-pro/text-to-image":
      return "google/nano-banana-pro/edit";
    case "google/nano-banana-2/text-to-image":
      return "google/nano-banana-2/edit";
    default:
      return modelName;
  }
};

// Split a mixed reference list into media-specific arrays.
// 将混合参考输入拆分为图片、视频、音频三类。
const splitReferenceList = (referenceList?: ReferenceList[]) => {
  const refs = referenceList || [];
  return {
    imageRefs: refs.filter((ref) => ref.type === "image").map((ref) => ref.base64),
    videoRefs: refs.filter((ref) => ref.type === "video").map((ref) => ref.base64),
    audioRefs: refs.filter((ref) => ref.type === "audio").map((ref) => ref.base64),
  };
};

const shouldGenerateAudio = (config: VideoConfig, model: VideoModel) => {
  return model.audio === true || (model.audio === "optional" && config.audio !== false);
};

const normalizeSeedanceResolution = (resolution: string) => {
  if (/^1080/i.test(resolution)) return "1080p";
  if (/^480/i.test(resolution)) return "480p";
  return "720p";
};

const normalizeWanResolution = (resolution: string) => {
  return /^1080/i.test(resolution) ? "1080P" : "720P";
};

// Build model-specific payloads so vendor differences stay localized.
// 按模型族构造请求体，把字段差异集中在一个地方处理。
const buildVideoRequestBody = (config: VideoConfig, model: VideoModel) => {
  const { imageRefs, videoRefs, audioRefs } = splitReferenceList(config.referenceList);
  const ratio = config.aspectRatio || "16:9";
  const baseBody: any = {
    model: model.modelName,
    prompt: config.prompt || "",
  };

  // Wan 2.7 uses a dedicated payload shape.
  // Wan 2.7 的字段与 Seedance 家族不同。
  if (model.modelName === "alibaba/wan-2.7/reference-to-video") {
    if (imageRefs.length > 0) baseBody.images = [imageRefs[0]];
    baseBody.ratio = ratio;
    baseBody.duration = clamp(Number(config.duration || 5), 2, 10);
    baseBody.resolution = normalizeWanResolution(String(config.resolution || ""));
    baseBody.prompt_extend = false;
    baseBody.seed = -1;
    return baseBody;
  }

  // Seedance family currently shares the same transport contract in Toonflow.
  // 当前 Toonflow 中的 Seedance 家族先复用同一套传输字段。
  if (shouldGenerateAudio(config, model)) {
    baseBody.generate_audio = true;
  }
  if (imageRefs.length > 0) baseBody.reference_images = imageRefs;
  if (videoRefs.length > 0) baseBody.reference_videos = videoRefs;
  if (audioRefs.length > 0) baseBody.reference_audios = audioRefs;
  baseBody.ratio = ratio;
  baseBody.duration = clamp(Number(config.duration || 5), 4, 15);
  baseBody.resolution = normalizeSeedanceResolution(String(config.resolution || ""));
  baseBody.watermark = false;
  return baseBody;
};

// ============================================================
// Adapter Functions / 适配器函数
// ============================================================

const textRequest = (model: TextModel, think: boolean, thinkLevel: 0 | 1 | 2 | 3) => {
  if (!vendor.inputValues.apiKey) throw new Error("缺少 API Key");
  const apiKey = normalizeApiKey(vendor.inputValues.apiKey);
  const effortMap: Record<number, string> = { 0: "minimal", 1: "low", 2: "medium", 3: "high" };

  return createOpenAICompatible({
    name: "atlascloud",
    baseURL: getChatBaseUrl(),
    apiKey,
    fetch: async (url: string, options?: RequestInit) => {
      const rawBody = JSON.parse((options?.body as string) ?? "{}");
      const body = think
        ? {
            ...rawBody,
            thinking: { type: "enabled" },
            reasoning_effort: effortMap[thinkLevel],
          }
        : rawBody;
      return await fetch(url, { ...options, body: JSON.stringify(body) });
    },
  }).chatModel(model.modelName);
};

const imageRequest = async (config: ImageConfig, model: ImageModel): Promise<string> => {
  const headers = getHeaders();
  const url = joinUrl(getMediaBaseUrl(), "/model/generateImage");
  const sizeToResolution: Record<ImageConfig["size"], string> = {
    "1K": "1k",
    "2K": "2k",
    "4K": "4k",
  };
  const imageRefs = (config.referenceList || []).map((ref) => ref.base64).filter(Boolean);
  const resolvedModelName = resolveAtlasImageModelName(model.modelName, imageRefs.length > 0);
  const isNanoModel = /^google\/nano-banana-(pro|2)\//.test(resolvedModelName);
  const supportsImageConditioning = /^(openai\/gpt-image-2\/text-to-image|google\/nano-banana-(pro|2)\/edit)$/.test(resolvedModelName);

  const body: any = {
    model: resolvedModelName,
    prompt: config.prompt || "",
  };
  if (supportsImageConditioning && imageRefs.length > 0) {
    body.images = imageRefs;
  }
  if (isNanoModel) {
    body.aspect_ratio = config.aspectRatio || "16:9";
    body.resolution = sizeToResolution[config.size || "1K"] || "1k";
  }

  logger(`[AtlasCloud 图片] 提交任务: ${model.modelName} -> ${resolvedModelName}`);
  const submitResp = await axios.post(url, body, { headers });
  const submitData = submitResp.data;

  // Sync path: the endpoint already returned a base64 image or media URL.
  // 同步返回：接口直接返回了 base64 或媒体地址。
  const syncB64 = extractB64(submitData);
  if (syncB64) return syncB64;
  const syncUrl = extractUrl(submitData);
  if (syncUrl) return await urlToBase64(syncUrl);

  // Async path: submit first, then poll by task id.
  // 异步返回：先提交任务，再按 task id 轮询。
  const taskId = extractTaskId(submitData);
  if (!taskId) {
    throw new Error(`图片任务提交失败：未获取到任务ID。原始响应：${JSON.stringify(submitData).slice(0, 500)}`);
  }

  const pollResult = await pollTask(
    async (): Promise<PollResult> => {
      const resultUrl = joinUrl(getMediaBaseUrl(), `/model/prediction/${taskId}`);
      const resultResp = await axios.get(resultUrl, { headers });
      const data = resultResp.data;
      const status = extractStatus(data);

      if (SUCCESS_STATUSES.includes(status)) {
        const b64 = extractB64(data);
        if (b64) return { completed: true, data: b64 };
        const mediaUrl = extractUrl(data);
        if (mediaUrl) return { completed: true, data: mediaUrl };
        return { completed: true, error: "任务成功但未返回结果地址" };
      }
      if (FAILURE_STATUSES.includes(status)) {
        return { completed: true, error: extractError(data) || "图片生成失败" };
      }
      return { completed: false };
    },
    3000,
    600000,
  );

  if (pollResult.error) throw new Error(pollResult.error);
  if (!pollResult.data) throw new Error("图片生成失败：轮询未返回数据");
  if (pollResult.data.startsWith("data:")) return pollResult.data;
  if (pollResult.data.startsWith("http")) return await urlToBase64(pollResult.data);
  return pollResult.data;
};

const videoRequest = async (config: VideoConfig, model: VideoModel): Promise<string> => {
  const headers = getHeaders();
  const url = joinUrl(getMediaBaseUrl(), "/model/generateVideo");
  const body = buildVideoRequestBody(config, model);

  logger(`[AtlasCloud 视频] 提交任务: ${model.modelName}`);
  const submitResp: any = await withNetworkRetry<any>(() => axios.post(url, body, { headers }), 3, 1500);
  const submitData = submitResp.data;

  const taskId = extractTaskId(submitData);
  if (!taskId) {
    const syncUrl = extractUrl(submitData);
    if (syncUrl) return await urlToBase64(syncUrl);
    throw new Error(`视频任务提交失败：未获取到任务ID。原始响应：${JSON.stringify(submitData).slice(0, 500)}`);
  }

  const pollResult = await pollTask(
    async (): Promise<PollResult> => {
      const resultUrl = joinUrl(getMediaBaseUrl(), `/model/prediction/${taskId}`);
      const resultResp: any = await withNetworkRetry<any>(() => axios.get(resultUrl, { headers }), 3, 1200);
      const data = resultResp.data;
      const status = extractStatus(data);

      if (SUCCESS_STATUSES.includes(status)) {
        const mediaUrl = extractUrl(data);
        if (mediaUrl) return { completed: true, data: mediaUrl };
        return { completed: true, error: "任务成功但未返回视频地址" };
      }
      if (FAILURE_STATUSES.includes(status)) {
        return { completed: true, error: extractError(data) || "视频生成失败" };
      }
      return { completed: false };
    },
    5000,
    1800000,
  );

  if (pollResult.error) throw new Error(pollResult.error);
  if (!pollResult.data) throw new Error("视频生成失败：轮询未返回数据");
  return await urlToBase64(pollResult.data);
};

const ttsRequest = async (_config: TTSConfig, _model: TTSModel): Promise<string> => {
  // TTS is intentionally left blank for this version.
  // 当前版本暂不接入 TTS。
  return "";
};

const checkForUpdates = async (): Promise<{ hasUpdate: boolean; latestVersion: string; notice: string }> => {
  return {
    hasUpdate: false,
    latestVersion: vendor.version,
    notice: "AtlasCloud MASS 初稿。",
  };
};

const updateVendor = async (): Promise<string> => {
  return "";
};

// ============================================================
// Exports / 导出
// ============================================================

exports.vendor = vendor;
exports.textRequest = textRequest;
exports.imageRequest = imageRequest;
exports.videoRequest = videoRequest;
exports.ttsRequest = ttsRequest;
exports.checkForUpdates = checkForUpdates;
exports.updateVendor = updateVendor;

export {};
