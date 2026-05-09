# AtlasCloud x Toonflow Configuration File

AtlasCloud MASS vendor adapter for Toonflow.

`atlascloud.ts` is a standalone TypeScript configuration file that plugs AtlasCloud text, image, and video models into Toonflow.

## Overview

- Supports OpenAI-compatible text models through `https://api.atlascloud.ai/v1`
- Supports image and video generation through `https://api.atlascloud.ai/api/v1`
- Includes polling logic for asynchronous media tasks
- Provides model-specific request mapping for Nano Banana, Seedance, and Wan

## File Structure

- `atlascloud.ts`: main vendor adapter file for Toonflow

## Included Capabilities

- Text chat model integration
- Image generation and image-edit style reference input
- Video generation with model-specific payload shaping
- Network retry handling and task polling helpers
- Bilingual comments for easier maintenance

## Notes

- The adapter expects Toonflow runtime globals such as `axios`, `pollTask`, `logger`, and `createOpenAICompatible`
- Media references are currently passed as Base64 inputs
- TTS export is reserved but intentionally left blank in this version

## Quick Start

1. Copy `atlascloud.ts` into Toonflow's vendor configuration location.
2. Fill in the AtlasCloud API key inside Toonflow vendor settings.
3. Keep the default text and media base URLs unless AtlasCloud provides a dedicated endpoint.

## GitHub Remote

Recommended remote repository:

```bash
git remote add origin git@github.com:AtlasCloudAI/AtlasCloudxToonflow-configuration-file.git
```

## 中文说明

这是一个给 Toonflow 使用的 AtlasCloud MASS 供应商配置文件。

- `atlascloud.ts` 是主配置文件
- 已补充中英文注释，便于二次维护
- 已整理图片、视频请求体构造逻辑
- 适合单独作为一个轻量配置仓库维护
