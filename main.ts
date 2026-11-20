// gta6-meme-x-01 参赛入口程序（Node 22 标准库，零外部依赖，无网络/时钟依赖）
// 读取仓库根目录的 POST.json，校验 X 帖子链接合法性，并将规范化后的结果输出到 /output/POST.json。

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface PostManifest {
  url: string;
}

const MAX_POST_BYTES = 16384;
const X_POST_URL_RE =
  /^https:\/\/(?:(?:www|mobile)\.)?(?:x|twitter)\.com\/(?:[A-Za-z0-9_]{1,15}|i\/web)\/status\/(\d+)(?:[/?#].*)?$/i;

function resolveDirs(): { botDir: string; outputDir: string } {
  return {
    botDir: process.env.MAKEFUN_BOT_DIR ?? '/bot',
    outputDir: process.env.MAKEFUN_OUTPUT_DIR ?? '/output',
  };
}

function loadAndValidatePost(postPath: string): PostManifest {
  const rawBuffer = readFileSync(postPath);
  if (rawBuffer.byteLength === 0 || rawBuffer.byteLength > MAX_POST_BYTES) {
    throw new Error(`POST.json size out of range: ${rawBuffer.byteLength} bytes`);
  }

  const parsed: unknown = JSON.parse(rawBuffer.toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('POST.json must be a JSON object');
  }

  const url = (parsed as Record<string, unknown>).url;
  if (typeof url !== 'string' || !X_POST_URL_RE.test(url.trim())) {
    throw new Error(`Invalid X post URL in POST.json: ${String(url)}`);
  }

  return { url: url.trim() };
}

function main(): void {
  try {
    const { botDir, outputDir } = resolveDirs();
    const sourcePath = join(botDir, 'POST.json');
    const destPath = join(outputDir, 'POST.json');

    const manifest = loadAndValidatePost(sourcePath);
    const serialized = `${JSON.stringify(manifest)}\n`;
    if (Buffer.byteLength(serialized, 'utf8') > MAX_POST_BYTES) {
      throw new Error('Normalized POST.json exceeds 16384-byte limit');
    }

    mkdirSync(outputDir, { recursive: true });
    writeFileSync(destPath, serialized, 'utf8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`gta6-meme-x-01 entry error: ${message}\n`);
    process.exit(1);
  }
}

main();
