import type { Page } from '@playwright/test'

export interface DiffRoi {
  x: number
  y: number
  width: number
  height: number
}

interface CountChangedPixelsOptions {
  roi: DiffRoi
  rgbDeltaThreshold?: number
  alphaDeltaThreshold?: number
}

interface EvaluateImageDiffInput {
  beforeBase64: string
  afterBase64: string
  roi: DiffRoi
  rgbDeltaThreshold: number
  alphaDeltaThreshold: number
}

export function readPngSize(png: Buffer): { width: number; height: number } {
  const pngSignatureHex = '89504e470d0a1a0a'
  if (png.length < 24 || png.subarray(0, 8).toString('hex') !== pngSignatureHex) {
    throw new Error('Expected PNG image data')
  }

  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  }
}

export async function countChangedPixels(
  page: Page,
  beforePng: Buffer,
  afterPng: Buffer,
  options: CountChangedPixelsOptions,
): Promise<number> {
  const input: EvaluateImageDiffInput = {
    beforeBase64: beforePng.toString('base64'),
    afterBase64: afterPng.toString('base64'),
    roi: options.roi,
    rgbDeltaThreshold: options.rgbDeltaThreshold ?? 45,
    alphaDeltaThreshold: options.alphaDeltaThreshold ?? 20,
  }

  return page.evaluate(async (payload) => {
    const loadImageData = async (base64: string): Promise<ImageData> => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()

      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('2D context is unavailable for screenshot diffing')
      }

      ctx.drawImage(image, 0, 0)
      return ctx.getImageData(0, 0, canvas.width, canvas.height)
    }

    const before = await loadImageData(payload.beforeBase64)
    const after = await loadImageData(payload.afterBase64)

    if (before.width !== after.width || before.height !== after.height) {
      throw new Error('Screenshot sizes do not match')
    }

    const x0 = Math.max(0, Math.floor(payload.roi.x))
    const y0 = Math.max(0, Math.floor(payload.roi.y))
    const x1 = Math.min(before.width, Math.ceil(payload.roi.x + payload.roi.width))
    const y1 = Math.min(before.height, Math.ceil(payload.roi.y + payload.roi.height))

    let changedPixels = 0
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const idx = (y * before.width + x) * 4
        const dr = Math.abs(before.data[idx] - after.data[idx])
        const dg = Math.abs(before.data[idx + 1] - after.data[idx + 1])
        const db = Math.abs(before.data[idx + 2] - after.data[idx + 2])
        const da = Math.abs(before.data[idx + 3] - after.data[idx + 3])

        if (dr + dg + db > payload.rgbDeltaThreshold || da > payload.alphaDeltaThreshold) {
          changedPixels += 1
        }
      }
    }

    return changedPixels
  }, input)
}
