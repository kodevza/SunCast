import { createAppError, err, ok, type AppError, type Result } from '../errors'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  if (typeof btoa !== 'function') {
    throw new Error('Base64 encoding is not supported in this environment.')
  }
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  if (typeof atob !== 'function') {
    throw new Error('Base64 decoding is not supported in this environment.')
  }
  const binary = atob(padded)
  return Uint8Array.from(binary, (char: string) => char.charCodeAt(0))
}

function toStrictArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

async function streamToUint8Array(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const response = new Response(stream)
  const buffer = await response.arrayBuffer()
  return new Uint8Array(buffer)
}

async function compress(input: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') {
    throw new Error('Share compression is not supported in this browser.')
  }

  const stream = new Blob([toStrictArrayBuffer(input)]).stream().pipeThrough(new CompressionStream('gzip'))
  return streamToUint8Array(stream)
}

async function decompress(input: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Share decompression is not supported in this browser.')
  }

  const stream = new Blob([toStrictArrayBuffer(input)]).stream().pipeThrough(new DecompressionStream('gzip'))
  return streamToUint8Array(stream)
}

export async function encodeSharePayload(rawJson: string): Promise<string> {
  const compressed = await compress(textEncoder.encode(rawJson))
  return toBase64Url(compressed)
}

export async function decodeSharePayload(encoded: string): Promise<string> {
  const result = await decodeSharePayloadResult(encoded)
  if (!result.ok) {
    throw new Error(result.error.message)
  }
  return result.value
}

export async function decodeSharePayloadResult(encoded: string): Promise<Result<string, AppError>> {
  try {
    const compressed = fromBase64Url(encoded)
    const decompressed = await decompress(compressed)
    return ok(textDecoder.decode(decompressed))
  } catch (cause) {
    return err(
      createAppError('SHARE_PAYLOAD_INVALID', 'Invalid shared URL payload.', {
        cause,
        context: { area: 'share-codec', enableStateReset: true },
      }),
    )
  }
}
