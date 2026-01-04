import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Source types supported by the library
 */
export const SourceType = z.enum([
  'newsletter',
  'transcript',
  'story-idea',
  'personal',
  'manuscript',
  'external',
]);

export type SourceType = z.infer<typeof SourceType>;

/**
 * Source configuration schema
 */
export const SourceConfigSchema = z.object({
  id: z.string(),
  type: SourceType,
  path: z.string(),
  label: z.string(),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  filePatterns: z.array(z.string()).optional().default(['**/*.txt', '**/*.md', '**/*.pdf', '**/*.docx']),
  excludePatterns: z.array(z.string()).optional().default(['**/node_modules/**', '**/.git/**']),
});

export type SourceConfig = z.infer<typeof SourceConfigSchema>;

/**
 * Sources configuration file schema
 */
export const SourcesFileSchema = z.object({
  sources: z.array(SourceConfigSchema),
});

export type SourcesFile = z.infer<typeof SourcesFileSchema>;

/**
 * Load sources configuration from the default file
 */
export function loadSourcesConfig(configPath?: string): SourcesFile {
  const path = configPath ?? join(__dirname, 'sources.json');

  if (!existsSync(path)) {
    return { sources: [] };
  }

  const content = readFileSync(path, 'utf-8');
  const data = JSON.parse(content);
  return SourcesFileSchema.parse(data);
}

/**
 * Get all enabled sources
 */
export function getEnabledSources(config?: SourcesFile): SourceConfig[] {
  const sources = config ?? loadSourcesConfig();
  return sources.sources.filter((s) => s.enabled);
}

/**
 * Get sources by type
 */
export function getSourcesByType(type: SourceType, config?: SourcesFile): SourceConfig[] {
  const sources = config ?? loadSourcesConfig();
  return sources.sources.filter((s) => s.type === type && s.enabled);
}

/**
 * Get a source by ID
 */
export function getSourceById(id: string, config?: SourcesFile): SourceConfig | undefined {
  const sources = config ?? loadSourcesConfig();
  return sources.sources.find((s) => s.id === id);
}

/**
 * Validate that a source path exists
 */
export function validateSourcePath(source: SourceConfig): boolean {
  return existsSync(source.path);
}
