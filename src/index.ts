#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { CallirraClient, KEY_PREFIX } from './client.js';

/** Read package.json version at runtime (single place, no drift). */
function packageVersion(): string {
  try {
    // dist/index.js -> ../package.json; src/index.ts -> ../../package.json
    const candidate = new URL('../package.json', import.meta.url);
    const pkg = JSON.parse(readFileSync(candidate, 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/** Read one of the data snapshots that ship with the package (built by scripts/build-data.mjs). */
function readData<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`./data/${name}`, import.meta.url), 'utf8')) as T;
}

interface PromptRecipe {
  slug: string;
  title: string;
  category: string;
  scene: string;
  config: Record<string, unknown>;
  credits: number | null;
  keywords: string[];
  prompt: string;
  deepLink: string | null;
}

let promptCache: { recipes: PromptRecipe[]; byCategory: Record<string, number> } | null = null;
function promptRecipes(): { recipes: PromptRecipe[]; byCategory: Record<string, number> } {
  promptCache ??= readData<{ recipes: PromptRecipe[]; byCategory: Record<string, number> }>('prompt-recipes.json');
  return promptCache;
}

interface SceneRecipe {
  slug: string;
  title: string;
  prompt: string;
  settings: Record<string, unknown>;
  refused: string[];
  page: string;
}

let sceneCache: { count: number; slugs: string[]; scenes: SceneRecipe[] } | null = null;
function sceneRecipes(): { count: number; slugs: string[]; scenes: SceneRecipe[] } {
  sceneCache ??= readData<{ count: number; slugs: string[]; scenes: SceneRecipe[] }>('scene-recipes.json');
  return sceneCache;
}

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

  // `version` wants the resolved string — passing the reader function itself made the server report
  // "vundefined" to every client that connected.
  const server = new McpServer({ name: 'callirra-mcp', version: packageVersion() });

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
      nsfw_checker: z.boolean().optional(),
      google_search: z.boolean().optional(),
    },
    async ({ model, prompt, size, n, image_input, reference_images, nsfw_checker, google_search }) => {
      try {
        const result = await client.generateImage({
          model,
          prompt,
          size,
          n,
          image_input,
          reference_images,
          nsfw_checker,
          google_search,
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
      input_images: z.array(z.string().url()).max(9).optional(),
      input_videos: z.array(z.string().url()).max(1).optional(),
      audio_input: z.array(z.string().url()).max(3).optional(),
      seed: z.number().int().optional(),
      seedance_mode: z.string().optional(),
      kling_mode: z.string().optional(),
      minimax_h3_mode: z.string().optional(),
      camera_fixed: z.boolean().optional(),
      kling_orientation: z.string().optional(),
      background_source: z.string().optional(),
      output_format: z.string().optional(),
      return_last_frame: z.boolean().optional(),
      audio_setting: z.string().optional(),
      nsfw_checker: z.boolean().optional(),
      google_search: z.boolean().optional(),
      wait: z.boolean().optional(),
    },
    async ({ model, prompt, duration, resolution, mode, aspect_ratio, generate_audio, frame_images, input_references, input_images, input_videos, audio_input, seed, seedance_mode, kling_mode, minimax_h3_mode, camera_fixed, kling_orientation, background_source, output_format, return_last_frame, audio_setting, nsfw_checker, google_search, wait }) => {
      try {
        const { job } = await client.createVideo({ model, prompt, duration, resolution, mode, aspect_ratio, generate_audio, frame_images, input_references, input_images, input_videos, audio_input, seed, seedance_mode, kling_mode, minimax_h3_mode, camera_fixed, kling_orientation, background_source, output_format, return_last_frame, audio_setting, nsfw_checker, google_search });
        if (wait) {
          const final = await client.waitForTask(job.id);
          if (final.status !== 'completed') {
            return toolError(`Task ${final.status}: ${final.error_message ?? 'no output'}`);
          }
          return toolResult(JSON.stringify(final, null, 2));
        }
        return toolResult(JSON.stringify(job, null, 2));
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.tool('list_videos', 'List recent video jobs', { limit: z.number().int().positive().max(100).optional() }, async ({ limit }) => {
    try {
      const { data } = await client.listVideos(limit ?? 20);
      return toolResult(JSON.stringify(data, null, 2));
    } catch (err) {
      return toolError(err instanceof Error ? err.message : String(err));
    }
  });

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

  /*
   * Recipe tools.
   *
   * These replace `list_prompt_templates` and `enhance_prompt`, which called an endpoint that now returns an
   * empty template list — so one of them returned nothing and the other could never be called correctly. The
   * data below is ours: 172 curated prompt recipes and the six worked Seedance 2.5 scenes, each with the exact
   * config, the credits the generator charges, and a deep link that opens it ready to run.
   */
  server.tool(
    'list_prompt_recipes',
    'Browse Callirra\'s curated prompt recipes (172 across 12 categories). Each row carries the model scene, the exact settings and the credits it costs. Call get_prompt_recipe for the prompt text itself. Live version: https://callirra.com/seedance-prompt-library',
    {
      category: z.string().optional(),
      scene: z.enum(['text-to-video', 'image-to-video']).optional(),
      limit: z.number().int().positive().max(50).optional(),
    },
    async ({ category, scene, limit }) => {
      try {
        const { recipes, byCategory } = promptRecipes();
        const filtered = recipes.filter(
          (r) => (!category || r.category === category) && (!scene || r.scene === scene),
        );
        const rows = filtered.slice(0, limit ?? 25).map((r) => ({
          slug: r.slug,
          title: r.title,
          category: r.category,
          scene: r.scene,
          config: r.config,
          credits: r.credits,
          keywords: r.keywords,
        }));
        return toolResult(
          JSON.stringify({ total: filtered.length, categories: byCategory, returned: rows.length, recipes: rows }, null, 2),
        );
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.tool(
    'get_prompt_recipe',
    'Get one prompt recipe in full: the prompt text to send, its settings, the credits it costs, and a link that opens the generator with everything pre-filled.',
    { slug: z.string().min(1) },
    async ({ slug }) => {
      try {
        const { recipes } = promptRecipes();
        const recipe = recipes.find((r) => r.slug === slug);
        if (!recipe) {
          return toolError(
            `No recipe with slug "${slug}". Use list_prompt_recipes to see the available slugs.`,
          );
        }
        return toolResult(JSON.stringify(recipe, null, 2));
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.tool(
    'get_scene_recipe',
    'Get Callirra\'s worked Seedance 2.5 scene recipes (wedding, swimwear, real-face, night-club, conflict, dance): the prompt to paste, the settings, the credits, and what a filtered route refuses for that scene. Live version: https://callirra.com/nsfw-video-generator',
    { scene: z.string().optional() },
    async ({ scene }) => {
      try {
        const data = sceneRecipes();
        if (!scene) return toolResult(JSON.stringify(data, null, 2));
        const found = data.scenes.find((s) => s.slug === scene);
        if (!found) {
          return toolError(`No scene "${scene}". Available: ${data.slugs.join(', ')}`);
        }
        return toolResult(JSON.stringify(found, null, 2));
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
