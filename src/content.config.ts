import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/docs',
    generateId: ({ entry }) => entry.replace(/\\/g, '/').replace(/\.md$/i, ''),
  }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    section: z.string().optional(),
    package: z.string().optional(),
    namespace: z.string().optional(),
  }),
});

export const collections = { docs };
