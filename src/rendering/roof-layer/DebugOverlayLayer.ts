import type maplibregl from 'maplibre-gl'
import type { RoofMeshData } from '../../types/geometry'
import { buildDebugOverlayGeometry } from './debugOverlayGeometry'

const FILL_COLOR: [number, number, number, number] = [0.08, 1, 0.3, 0.34]
const LOOP_COLOR: [number, number, number, number] = [0.05, 1, 1, 1]
const STEM_COLOR: [number, number, number, number] = [1, 0.9, 0.1, 1]
const MARKER_COLOR: [number, number, number, number] = [1, 0.1, 0.95, 1]
const LOOP_LINE_WIDTH = 3
const MARKER_POINT_SIZE = 14

export class DebugOverlayLayer implements maplibregl.CustomLayerInterface {
  id: string
  type = 'custom' as const
  renderingMode = '2d' as const

  private map: maplibregl.Map | null = null
  private gl: (WebGLRenderingContext | WebGL2RenderingContext) | null = null
  private program: WebGLProgram | null = null
  private fillBuffer: WebGLBuffer | null = null
  private loopBuffer: WebGLBuffer | null = null
  private stemBuffer: WebGLBuffer | null = null
  private loopsPerMesh: number[] = []
  private fillVertexCount = 0
  private loopVertexCount = 0
  private stemVertexCount = 0
  private meshes: RoofMeshData[] = []
  private zExaggeration = 1
  private visible = true
  private aPosLocation = -1
  private uMatrixLocation: WebGLUniformLocation | null = null
  private uColorLocation: WebGLUniformLocation | null = null
  private uPointSizeLocation: WebGLUniformLocation | null = null

  constructor(id = 'roof-debug-overlay-layer') {
    this.id = id
  }

  onAdd(map: maplibregl.Map, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.map = map
    this.gl = gl
    this.program = createProgram(gl)
    this.fillBuffer = gl.createBuffer()
    this.loopBuffer = gl.createBuffer()
    this.stemBuffer = gl.createBuffer()
    this.aPosLocation = gl.getAttribLocation(this.program, 'a_pos')
    this.uMatrixLocation = gl.getUniformLocation(this.program, 'u_matrix')
    this.uColorLocation = gl.getUniformLocation(this.program, 'u_color')
    this.uPointSizeLocation = gl.getUniformLocation(this.program, 'u_point_size')
    this.uploadBuffer()
  }

  onRemove(): void {
    if (this.gl && this.fillBuffer) {
      this.gl.deleteBuffer(this.fillBuffer)
    }
    if (this.gl && this.loopBuffer) {
      this.gl.deleteBuffer(this.loopBuffer)
    }
    if (this.gl && this.stemBuffer) {
      this.gl.deleteBuffer(this.stemBuffer)
    }
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program)
    }

    this.map = null
    this.gl = null
    this.program = null
    this.fillBuffer = null
    this.loopBuffer = null
    this.stemBuffer = null
    this.loopsPerMesh = []
    this.fillVertexCount = 0
    this.loopVertexCount = 0
    this.stemVertexCount = 0
    this.aPosLocation = -1
    this.uMatrixLocation = null
    this.uColorLocation = null
    this.uPointSizeLocation = null
  }

  setMeshes(meshes: RoofMeshData[]): void {
    this.meshes = meshes
    this.uploadBuffer()
  }

  setZExaggeration(zExaggeration: number): void {
    this.zExaggeration = Math.max(0.1, zExaggeration)
    this.uploadBuffer()
  }

  setVisible(visible: boolean): void {
    this.visible = visible
    this.map?.triggerRepaint()
  }

  private uploadBuffer(): void {
    if (!this.gl || !this.fillBuffer || !this.loopBuffer || !this.stemBuffer) {
      return
    }

    const geometry = buildDebugOverlayGeometry(this.meshes, this.zExaggeration)
    this.loopsPerMesh = geometry.loopsPerMesh
    this.fillVertexCount = geometry.fillVertexCount
    this.loopVertexCount = geometry.loopVertexCount
    this.stemVertexCount = geometry.stemVertexCount

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.fillBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(geometry.fillCoords), this.gl.DYNAMIC_DRAW)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.loopBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(geometry.loopCoords), this.gl.DYNAMIC_DRAW)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.stemBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(geometry.stemCoords), this.gl.DYNAMIC_DRAW)
    this.map?.triggerRepaint()
  }

  render(gl: WebGLRenderingContext | WebGL2RenderingContext, options: maplibregl.CustomRenderMethodInput): void {
    if (!this.visible) {
      return
    }
    if (
      !this.program ||
      !this.fillBuffer ||
      !this.loopBuffer ||
      !this.stemBuffer ||
      this.aPosLocation < 0 ||
      !this.uMatrixLocation ||
      !this.uColorLocation ||
      !this.uPointSizeLocation
    ) {
      return
    }

    gl.useProgram(this.program)
    gl.uniformMatrix4fv(this.uMatrixLocation, false, options.modelViewProjectionMatrix)
    const prevDepthEnabled = gl.isEnabled(gl.DEPTH_TEST)
    const prevCullEnabled = gl.isEnabled(gl.CULL_FACE)
    const prevBlendEnabled = gl.isEnabled(gl.BLEND)
    const prevDepthMask = gl.getParameter(gl.DEPTH_WRITEMASK) as boolean
    const prevBlendSrcRGB = gl.getParameter(gl.BLEND_SRC_RGB) as number
    const prevBlendDstRGB = gl.getParameter(gl.BLEND_DST_RGB) as number
    const prevBlendSrcAlpha = gl.getParameter(gl.BLEND_SRC_ALPHA) as number
    const prevBlendDstAlpha = gl.getParameter(gl.BLEND_DST_ALPHA) as number
    const prevLineWidth = gl.getParameter(gl.LINE_WIDTH) as number

    try {
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      // Debug overlay should stay visible even when roof fill depth dominates.
      gl.disable(gl.DEPTH_TEST)
      gl.depthMask(false)
      gl.disable(gl.CULL_FACE)

      if (this.fillVertexCount > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.fillBuffer)
        gl.enableVertexAttribArray(this.aPosLocation)
        gl.vertexAttribPointer(this.aPosLocation, 3, gl.FLOAT, false, 0, 0)
        gl.uniform1f(this.uPointSizeLocation, 1)
        gl.uniform4f(this.uColorLocation, ...FILL_COLOR)
        gl.drawArrays(gl.TRIANGLES, 0, this.fillVertexCount)
      }

      if (this.loopVertexCount > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.loopBuffer)
        gl.enableVertexAttribArray(this.aPosLocation)
        gl.vertexAttribPointer(this.aPosLocation, 3, gl.FLOAT, false, 0, 0)
        gl.lineWidth(LOOP_LINE_WIDTH)
        gl.uniform1f(this.uPointSizeLocation, 1)
        gl.uniform4f(this.uColorLocation, ...LOOP_COLOR)
        let offset = 0
        for (const count of this.loopsPerMesh) {
          gl.drawArrays(gl.LINE_LOOP, offset, count)
          offset += count
        }

        gl.uniform1f(this.uPointSizeLocation, MARKER_POINT_SIZE)
        gl.uniform4f(this.uColorLocation, ...MARKER_COLOR)
        gl.drawArrays(gl.POINTS, 0, this.loopVertexCount)
      }

      if (this.stemVertexCount > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.stemBuffer)
        gl.enableVertexAttribArray(this.aPosLocation)
        gl.vertexAttribPointer(this.aPosLocation, 3, gl.FLOAT, false, 0, 0)
        gl.uniform1f(this.uPointSizeLocation, 1)
        gl.uniform4f(this.uColorLocation, ...STEM_COLOR)
        gl.drawArrays(gl.LINES, 0, this.stemVertexCount)
      }
    } finally {
      gl.lineWidth(prevLineWidth)
      gl.depthMask(prevDepthMask)
      gl.blendFuncSeparate(prevBlendSrcRGB, prevBlendDstRGB, prevBlendSrcAlpha, prevBlendDstAlpha)
      if (prevDepthEnabled) {
        gl.enable(gl.DEPTH_TEST)
      } else {
        gl.disable(gl.DEPTH_TEST)
      }
      if (prevCullEnabled) {
        gl.enable(gl.CULL_FACE)
      } else {
        gl.disable(gl.CULL_FACE)
      }
      if (prevBlendEnabled) {
        gl.enable(gl.BLEND)
      } else {
        gl.disable(gl.BLEND)
      }
    }
  }
}

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) {
    throw new Error('Failed to create shader')
  }

  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'unknown shader compile error'
    gl.deleteShader(shader)
    throw new Error(message)
  }
  return shader
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vertexShader = createShader(
    gl,
    gl.VERTEX_SHADER,
    `
      precision highp float;
      uniform mat4 u_matrix;
      uniform float u_point_size;
      attribute vec3 a_pos;
      void main() {
        gl_PointSize = u_point_size;
        gl_Position = u_matrix * vec4(a_pos, 1.0);
      }
    `,
  )
  const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    `
      precision highp float;
      uniform vec4 u_color;
      void main() {
        gl_FragColor = u_color;
      }
    `,
  )

  const program = gl.createProgram()
  if (!program) {
    throw new Error('Failed to create program')
  }
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'unknown program link error'
    gl.deleteProgram(program)
    throw new Error(message)
  }
  return program
}
