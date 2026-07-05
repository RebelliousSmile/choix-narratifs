import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Collection « articles » — vide au démarrage. Déposer des fichiers Markdown dans
// `src/content/articles/` avec le frontmatter décrit par le schéma ci-dessous.
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { articles };
