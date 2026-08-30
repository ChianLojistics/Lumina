/**
 * Export the OpenAPI specification from a running Lumina backend instance.
 *
 * Usage:
 *   npx ts-node scripts/export-openapi.ts [baseUrl] [outputDir]
 *
 * Defaults:
 *   baseUrl  = http://localhost:4000
 *   outputDir = ../docs/api-reference
 *
 * The script fetches the JSON spec from the Swagger endpoint and writes:
 *   - openapi.json   (raw OpenAPI 3.0 spec)
 *   - api-reference.md (auto-generated Markdown reference)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const baseUrl = process.argv[2] || 'http://localhost:4000';
const outputDir = process.argv[3] || join(__dirname, '../../docs/api-reference');

async function main() {
  console.log(`Fetching OpenAPI spec from ${baseUrl}/api/docs-json ...`);

  const response = await fetch(`${baseUrl}/api/docs-json`);
  if (!response.ok) {
    console.error(`Failed to fetch spec: HTTP ${response.status}`);
    process.exit(1);
  }

  const spec = await response.json() as any;

  mkdirSync(outputDir, { recursive: true });

  // Write raw JSON spec
  const jsonPath = join(outputDir, 'openapi.json');
  writeFileSync(jsonPath, JSON.stringify(spec, null, 2));
  console.log(`Written: ${jsonPath}`);

  // Generate Markdown reference
  const markdown = generateMarkdown(spec);
  const mdPath = join(outputDir, 'api-reference.md');
  writeFileSync(mdPath, markdown);
  console.log(`Written: ${mdPath}`);

  console.log(`\nDone. ${Object.keys(spec.paths || {}).length} paths documented.`);
}

function generateMarkdown(spec: any): string {
  const lines: string[] = [];

  lines.push(`# ${spec.info?.title || 'API'} Reference`);
  lines.push('');
  lines.push(`> Version: ${spec.info?.version || 'unknown'}`);
  lines.push('');
  lines.push(`${spec.info?.description || ''}`);
  lines.push('');

  // Servers
  if (spec.servers?.length) {
    lines.push('## Servers');
    lines.push('');
    for (const server of spec.servers) {
      lines.push(`- **${server.description || server.url}**: \`${server.url}\``);
    }
    lines.push('');
  }

  // Tags
  const tags = spec.tags || [];
  const paths = spec.paths || {};

  // Group paths by tag
  const tagGroups: Record<string, Array<{ path: string; method: string; op: any }>> = {};
  for (const [path, methods] of Object.entries(paths) as any) {
    for (const [method, op] of Object.entries(methods) as any) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
        const tag = op.tags?.[0] || 'General';
        if (!tagGroups[tag]) tagGroups[tag] = [];
        tagGroups[tag].push({ path, method, op });
      }
    }
  }

  for (const [tag, operations] of Object.entries(tagGroups)) {
    lines.push(`## ${tag}`);
    lines.push('');

    const tagMeta = tags.find((t: any) => t.name === tag);
    if (tagMeta?.description) {
      lines.push(`${tagMeta.description}`);
      lines.push('');
    }

    for (const { path: opPath, method, op } of operations) {
      lines.push(`### \`${method.toUpperCase()}\` ${opPath}`);
      lines.push('');
      lines.push(`${op.summary || op.description || ''}`);
      lines.push('');

      if (op.parameters?.length) {
        lines.push('**Parameters:**');
        lines.push('');
        lines.push('| Name | In | Type | Required | Description |');
        lines.push('|------|-----|------|----------|-------------|');
        for (const param of op.parameters) {
          lines.push(
            `| ${param.name} | ${param.in} | ${param.schema?.type || 'string'} | ${param.required ? 'Yes' : 'No'} | ${param.description || ''} |`,
          );
        }
        lines.push('');
      }

      if (op.requestBody) {
        lines.push('**Request Body:**');
        lines.push('');
        const content = op.requestBody.content?.['application/json'];
        if (content?.schema) {
          lines.push('```json');
          lines.push(JSON.stringify(content.schema.example || {}, null, 2));
          lines.push('```');
        }
        lines.push('');
      }

      if (op.responses) {
        lines.push('**Responses:**');
        lines.push('');
        for (const [code, resp] of Object.entries(op.responses) as any) {
          lines.push(`- **${code}**: ${resp.description || ''}`);
        }
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n');
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
