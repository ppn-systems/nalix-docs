import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const rawGlobLoader = glob({
  pattern: '**/*.md',
  base: './src/content/docs',
  generateId: ({ entry }) => entry.replace(/\\/g, '/').replace(/\.md$/i, ''),
});

const docs = defineCollection({
  loader: {
    name: rawGlobLoader.name,
    load: async (context) => {
      const seenInRun = new Set<string>();
      let initialSyncDone = false;
      await rawGlobLoader.load({
        ...context,
        parseData: async (props) => {
          // Clear stale cached entry from .astro/data-store.json when a file's digest changes
          // or during HMR file reloads so Astro's glob-loader never emits false "Duplicate id" warnings.
          if (initialSyncDone || !seenInRun.has(props.id)) {
            seenInRun.add(props.id);
            context.store.delete(props.id);
          }
          return context.parseData(props);
        },
      });
      initialSyncDone = true;
    },
  },
  schema: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    section: z.string().optional(),
    package: z.string().optional(),
    namespace: z.string().optional(),
  }),
});

export const collections = { docs };
