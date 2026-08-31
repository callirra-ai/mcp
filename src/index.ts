#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CallirraClient, KEY_PREFIX } from './client.js';

function toolResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function toolError(message: string) {
  return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
}

async function main(): Promise<void> {
  const apiKey = process.env.CALLIRRA_API_KEY ?? '';
  if (!apiKey.startsWith(KEY_PREFIX)) {
    console.error(`CALLIRRA_API_KEY is required and must start with ${KEY_PREFIX}`);
    process.exit(1);
  }

  const client = new CallirraClient({
    apiKey,
    apiBase: process.env.CALLIRRA_API_BASE,
  });

  const server = new McpServer({ name: 'callirra-mcp', version: '0.1.0' });

  server.tool('list_models', 'List available image and video models', {}, async () => {
    try {
      const { data } = await client.listModels();
      return toolResult(JSON.stringify(data, null, 2));
    } catch (err) {
      return toolError(err instanceof Error ? err.message : String(err));
    }
  });

  server.tool('get_balance', 'Check credits and available balance', {}, async () => {
    try {
      const balance = await client.getBalance();
      return toolResult(JSON.stringify(balance, null, 2));
    } catch (err) {
      return toolError(err instanceof Error ? err.message : String(err));
    }
  });

  server.tool('get_usage', 'Check recent usage records', { limit: z.number().int().positive().max(100).optional() }, async ({ limit }) => {
    try {
      const { data } = await client.getUsage(limit ?? 20);
      return toolResult(JSON.stringify(data, null, 2));
    } catch (err) {
      return toolError(err instanceof Error ? err.message : String(err));
    }
  });

  server.tool(
    'generate_image',
    'Generate an image with a supported model',
    {
      model: z.string().min(1),
      prompt: z.string().min(1),
      size: z.string().optional(),
      n: z.number().int().positive().max(4).optional(),
      image_input: z.string().url().optional(),
      reference_images: z.array(z.string().url()).max(8).optional(),
    },
    async ({ model, prompt, size, n, image_input, reference_images }) => {
      try {
        const result = await client.generateImage({
          model,
          prompt,
          size,
          n,
          image_input,
          reference_images,
        });
        return toolResult(JSON.stringify(result, null, 2));
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.tool(
    'create_video',
    'Create an asynchronous video generation task',
    {
      model: z.string().min(1),
      prompt: z.string().min(1),
      duration: z.number().int().min(1).max(60).optional(),
      resolution: z.string().optional(),
      mode: z.string().optional(),
      aspect_ratio: z.string().optional(),
      generate_audio: z.boolean().optional(),
      frame_images: z.array(z.string().url()).max(8).optional(),
      input_references: z.array(z.string().url()).max(8).optional(),
      wait: z.boolean().optional(),
    },
    async ({ model, prompt, duration, resolution, mode, aspect_ratio, generate_audio, frame_images, input_references, wait }) => {
      try {
        const { job } = await client.createVideo({ model, prompt, duration, resolution, mode, aspect_ratio, generate_audio, frame_images, input_references });
        if (wait) {
          const final = await client.waitForTask(job.id);
          return toolResult(JSON.stringify(final, null, 2));
        }
        return toolResult(JSON.stringify(job, null, 2));
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.tool('get_task', 'Get a video task status', { id: z.string().min(1) }, async ({ id }) => {
    try {
      const { job } = await client.getTask(id);
      return toolResult(JSON.stringify(job, null, 2));
    } catch (err) {
      return toolError(err instanceof Error ? err.message : String(err));
    }
  });

  server.tool('cancel_task', 'Cancel a queued or running video task', { id: z.string().min(1) }, async ({ id }) => {
    try {
      const { job } = await client.cancelTask(id);
      return toolResult(JSON.stringify(job, null, 2));
    } catch (err) {
      return toolError(err instanceof Error ? err.message : String(err));
    }
  });

  server.tool(
    'upload_media',
    'Upload a base64-encoded reference image and get a signed URL',
    {
      data: z.string().min(4),
      content_type: z.string().optional(),
      filename: z.string().optional(),
    },
    async ({ data, content_type, filename }) => {
      try {
        const result = await client.uploadReference({ data, content_type, filename });
        return toolResult(JSON.stringify(result, null, 2));
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.tool('list_prompt_templates', 'List Callirra Prompt Studio templates', {}, async () => {
    try {
      const data = await client.listPromptTemplates();
      return toolResult(JSON.stringify(data.templates, null, 2));
    } catch (err) {
      return toolError(err instanceof Error ? err.message : String(err));
    }
  });

  server.tool(
    'enhance_prompt',
    'Enhance an idea with a built-in Prompt Studio template',
    {
      templateId: z.string().min(1),
      idea: z.string().min(1).max(1000),
      kind: z.enum(['video', 'image']).optional(),
      language: z.enum(['zh', 'en']).optional(),
    },
    async ({ templateId, idea, kind, language }) => {
      try {
        const result = await client.enhancePrompt({ templateId, idea, kind, language });
        return toolResult(JSON.stringify(result, null, 2));
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.tool('get_creative_knowledge', 'Get the curated creative/art/image/video knowledge base', {}, async () => {
    try {
      const data = await client.getCreativeKnowledge();
      return toolResult(JSON.stringify(data, null, 2));
    } catch (err) {
      return toolError(err instanceof Error ? err.message : String(err));
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
