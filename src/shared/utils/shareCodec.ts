const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64')
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString('binary')
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
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

  const stream = new Blob([input]).stream().pipeThrough(new CompressionStream('gzip'))
  return streamToUint8Array(stream)
}

async function decompress(input: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Share decompression is not supported in this browser.')
  }

  const stream = new Blob([input]).stream().pipeThrough(new DecompressionStream('gzip'))
  return streamToUint8Array(stream)
}

export async function encodeSharePayload(rawJson: string): Promise<string> {
  const compressed = await compress(textEncoder.encode(rawJson))
  return toBase64Url(compressed)
}

export async function decodeSharePayload(encoded: string): Promise<string> {
  try {
    const compressed = fromBase64Url(encoded)
    const decompressed = await decompress(compressed)
    return textDecoder.decode(decompressed)
  } catch {
    throw new Error('Invalid shared URL payload')
  }
}
