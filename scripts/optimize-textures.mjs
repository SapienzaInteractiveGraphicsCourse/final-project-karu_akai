import { spawn } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, 'public', 'textures');
const targetRoot = path.join(projectRoot, 'public', 'textures_optimized');
const reportPath = path.join(projectRoot, 'TEXTURE_OPTIMIZATION_REPORT.md');

const TEXTURES = [
  {
    source: 'background/library-background.png',
    target: 'background/library-background.jpg',
    kind: 'background',
    maxSize: 1536,
    quality: 88,
  },
  {
    source: 'case/case-color.png',
    target: 'case/case-color.jpg',
    kind: 'color',
    maxSize: 2048,
    quality: 90,
  },
  {
    source: 'case/case-normal.png',
    target: 'case/case-normal.jpg',
    kind: 'normal',
    maxSize: 1024,
    quality: 92,
  },
  {
    source: 'case/case-roughness.png',
    target: 'case/case-roughness.jpg',
    kind: 'roughness',
    maxSize: 1024,
    quality: 86,
  },
  {
    source: 'dummy/dummy-color.jpg',
    target: 'dummy/dummy-color.jpg',
    kind: 'color',
    maxSize: 1024,
    quality: 88,
  },
  {
    source: 'dummy/dummy-normal.jpg',
    target: 'dummy/dummy-normal.jpg',
    kind: 'normal',
    maxSize: 1024,
    quality: 92,
  },
  {
    source: 'dummy/dummy-roughness.jpg',
    target: 'dummy/dummy-roughness.jpg',
    kind: 'roughness',
    maxSize: 512,
    quality: 84,
  },
  {
    source: 'fans/fans-color.png',
    target: 'fans/fans-color.jpg',
    kind: 'color',
    maxSize: 1024,
    quality: 88,
  },
  {
    source: 'fans/fans-metalness.png',
    target: 'fans/fans-metalness.jpg',
    kind: 'metalness',
    maxSize: 512,
    quality: 84,
  },
  {
    source: 'fans/fans-normal.png',
    target: 'fans/fans-normal.jpg',
    kind: 'normal',
    maxSize: 1024,
    quality: 92,
  },
  {
    source: 'fans/fans-roughness.png',
    target: 'fans/fans-roughness.jpg',
    kind: 'roughness',
    maxSize: 512,
    quality: 84,
  },
  {
    source: 'metal043a/metal-color.png',
    target: 'metal043a/metal-color.jpg',
    kind: 'color',
    maxSize: 1024,
    quality: 88,
  },
  {
    source: 'metal043a/metal-metalness.png',
    target: 'metal043a/metal-metalness.jpg',
    kind: 'metalness',
    maxSize: 512,
    quality: 84,
  },
  {
    source: 'metal043a/metal-normal.png',
    target: 'metal043a/metal-normal.jpg',
    kind: 'normal',
    maxSize: 1024,
    quality: 92,
  },
  {
    source: 'metal043a/metal-roughness.png',
    target: 'metal043a/metal-roughness.jpg',
    kind: 'roughness',
    maxSize: 512,
    quality: 84,
  },
  {
    source: 'metal045a/metal-color.jpg',
    target: 'metal045a/metal-color.jpg',
    kind: 'color',
    maxSize: 1024,
    quality: 88,
  },
  {
    source: 'metal045a/metal-metalness.jpg',
    target: 'metal045a/metal-metalness.jpg',
    kind: 'metalness',
    maxSize: 512,
    quality: 84,
  },
  {
    source: 'metal045a/metal-normal.jpg',
    target: 'metal045a/metal-normal.jpg',
    kind: 'normal',
    maxSize: 1024,
    quality: 92,
  },
  {
    source: 'metal045a/metal-roughness.jpg',
    target: 'metal045a/metal-roughness.jpg',
    kind: 'roughness',
    maxSize: 512,
    quality: 84,
  },
  {
    source: 'plastic004/plastic-color.png',
    target: 'plastic004/plastic-color.jpg',
    kind: 'color',
    maxSize: 1024,
    quality: 88,
  },
  {
    source: 'plastic004/plastic-normal.png',
    target: 'plastic004/plastic-normal.jpg',
    kind: 'normal',
    maxSize: 1024,
    quality: 92,
  },
  {
    source: 'plastic004/plastic-roughness.png',
    target: 'plastic004/plastic-roughness.jpg',
    kind: 'roughness',
    maxSize: 512,
    quality: 84,
  },
  {
    source: 'plastic013a/plastic-color.jpg',
    target: 'plastic013a/plastic-color.jpg',
    kind: 'color',
    maxSize: 1024,
    quality: 88,
  },
  {
    source: 'plastic013a/plastic-normal.jpg',
    target: 'plastic013a/plastic-normal.jpg',
    kind: 'normal',
    maxSize: 1024,
    quality: 92,
  },
  {
    source: 'plastic013a/plastic-roughness.jpg',
    target: 'plastic013a/plastic-roughness.jpg',
    kind: 'roughness',
    maxSize: 512,
    quality: 84,
  },
  {
    source: 'table/table-color.png',
    target: 'table/table-color.jpg',
    kind: 'color',
    maxSize: 2048,
    quality: 90,
  },
  {
    source: 'table/table-normal.png',
    target: 'table/table-normal.jpg',
    kind: 'normal',
    maxSize: 1024,
    quality: 92,
  },
  {
    source: 'table/table-roughness.png',
    target: 'table/table-roughness.jpg',
    kind: 'roughness',
    maxSize: 1024,
    quality: 86,
  },
];

const PYTHON_OPTIMIZER = String.raw`
import json
import os
import sys

try:
    from PIL import Image, ImageChops, ImageOps
except Exception as error:
    print(f"Python fallback requires Pillow: {error}", file=sys.stderr)
    sys.exit(2)

Image.MAX_IMAGE_PIXELS = None

try:
    RESAMPLE = Image.Resampling.LANCZOS
except AttributeError:
    RESAMPLE = Image.LANCZOS


def equal_rgb_channels(image):
    if image.mode != "RGB":
        return False

    red, green, blue = image.split()
    return (
        ImageChops.difference(red, green).getbbox() is None
        and ImageChops.difference(red, blue).getbbox() is None
    )


def to_jpeg_image(image, kind):
    has_alpha = image.mode in ("RGBA", "LA") or "transparency" in image.info

    if has_alpha:
        rgba = image.convert("RGBA")
        base = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        base.alpha_composite(rgba)
        image = base.convert("RGB")
    elif image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    if kind in ("background", "color", "normal") and image.mode != "RGB":
        image = image.convert("RGB")

    if kind in ("metalness", "roughness") and equal_rgb_channels(image):
        image = image.convert("L")

    return image


def optimize(task):
    source = task["sourcePath"]
    target = task["targetPath"]
    kind = task["kind"]
    max_size = task["maxSize"]

    with Image.open(source) as opened:
        original_width, original_height = opened.size
        image = ImageOps.exif_transpose(opened)
        image = to_jpeg_image(image, kind)

        if max(image.size) > max_size:
            image.thumbnail((max_size, max_size), RESAMPLE)

        os.makedirs(os.path.dirname(target), exist_ok=True)

        save_options = {
            "quality": task["quality"],
            "optimize": True,
        }

        if image.mode == "RGB":
            save_options["subsampling"] = 0 if kind == "normal" else 2

        try:
            image.save(target, "JPEG", **save_options)
        except Exception as error:
            save_options.pop("optimize", None)
            try:
                image.save(target, "JPEG", **save_options)
            except Exception as fallback_error:
                raise RuntimeError(
                    f"{source} -> {target}: {fallback_error}"
                ) from fallback_error

    with Image.open(target) as optimized:
        final_width, final_height = optimized.size

    return {
        "source": task["source"],
        "target": task["target"],
        "kind": kind,
        "originalWidth": original_width,
        "originalHeight": original_height,
        "finalWidth": final_width,
        "finalHeight": final_height,
    }


payload = json.load(sys.stdin)
results = [optimize(task) for task in payload["tasks"]]
json.dump({"engine": "pillow", "results": results}, sys.stdout)
`;

function publicPath(rootName, relativePath) {
  return `public/${rootName}/${relativePath}`;
}

function formatBytes(bytes) {
  const units = ['B', 'KiB', 'MiB', 'GiB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function formatResolution(width, height) {
  return `${width}x${height}`;
}

async function loadSharp() {
  try {
    const sharpModule = await import('sharp');
    return sharpModule.default;
  } catch {
    return null;
  }
}

async function optimizeWithSharp(sharp, tasks) {
  const results = [];

  for (const task of tasks) {
    await mkdir(path.dirname(task.targetPath), { recursive: true });

    const sourceImage = sharp(task.sourcePath, { failOn: 'none' }).rotate();
    const originalMetadata = await sourceImage.metadata();

    const jpegOptions = {
      quality: task.quality,
      mozjpeg: true,
      chromaSubsampling: task.kind === 'normal' ? '4:4:4' : '4:2:0',
    };

    await sharp(task.sourcePath, { failOn: 'none' })
      .rotate()
      .resize({
        width: task.maxSize,
        height: task.maxSize,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .flatten({ background: '#ffffff' })
      .jpeg(jpegOptions)
      .toFile(task.targetPath);

    const finalMetadata = await sharp(task.targetPath).metadata();

    results.push({
      source: task.source,
      target: task.target,
      kind: task.kind,
      originalWidth: originalMetadata.width,
      originalHeight: originalMetadata.height,
      finalWidth: finalMetadata.width,
      finalHeight: finalMetadata.height,
    });
  }

  return { engine: 'sharp', results };
}

async function optimizeWithPillow(tasks) {
  const child = spawn('python3', ['-c', PYTHON_OPTIMIZER], {
    cwd: projectRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  child.stdin.end(JSON.stringify({ tasks }));

  const exitCode = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });

  if (exitCode !== 0) {
    throw new Error(stderr || `Python optimizer exited with code ${exitCode}`);
  }

  return JSON.parse(stdout);
}

async function addFileSizes(results) {
  return Promise.all(
    results.map(async (result) => {
      const originalSize = (await stat(path.join(sourceRoot, result.source))).size;
      const finalSize = (await stat(path.join(targetRoot, result.target))).size;
      const reduction = ((originalSize - finalSize) / originalSize) * 100;

      return {
        ...result,
        originalSize,
        finalSize,
        reduction,
      };
    })
  );
}

function buildReport(engine, results) {
  const totalOriginal = results.reduce((sum, item) => sum + item.originalSize, 0);
  const totalFinal = results.reduce((sum, item) => sum + item.finalSize, 0);
  const totalReduction = ((totalOriginal - totalFinal) / totalOriginal) * 100;

  const rows = results.map((item) =>
    [
      publicPath('textures', item.source),
      publicPath('textures_optimized', item.target),
      formatResolution(item.originalWidth, item.originalHeight),
      formatResolution(item.finalWidth, item.finalHeight),
      formatBytes(item.originalSize),
      formatBytes(item.finalSize),
      formatPercent(item.reduction),
    ].join(' | ')
  );

  return [
    '# Texture Optimization Report',
    '',
    `Generated by \`node scripts/optimize-textures.mjs\` using ${engine}.`,
    '',
    `Selected source total: ${formatBytes(totalOriginal)}`,
    `Optimized total: ${formatBytes(totalFinal)}`,
    `Selected-file reduction: ${formatPercent(totalReduction)}`,
    '',
    '| Original path | Optimized path | Original resolution | Final resolution | Original weight | Final weight | Reduction |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
    ...rows,
    '',
  ].join('\n');
}

async function main() {
  const tasks = TEXTURES.map((texture) => ({
    ...texture,
    sourcePath: path.join(sourceRoot, texture.source),
    targetPath: path.join(targetRoot, texture.target),
  }));

  await mkdir(targetRoot, { recursive: true });

  const sharp = await loadSharp();
  const optimization = sharp
    ? await optimizeWithSharp(sharp, tasks)
    : await optimizeWithPillow(tasks);
  const results = await addFileSizes(optimization.results);
  const report = buildReport(optimization.engine, results);

  await writeFile(reportPath, report);

  console.log(`Optimized ${results.length} textures with ${optimization.engine}.`);
  console.log(`Wrote ${path.relative(projectRoot, reportPath)}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
