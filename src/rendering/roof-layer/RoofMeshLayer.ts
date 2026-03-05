import maplibregl from 'maplibre-gl'
import type { RoofMeshData } from '../../types/geometry'

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) {
    throw new Error('Failed to create shader')
  }

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'unknown shader compile error'
    gl.deleteShader(shader)
    throw new Error(log)
  }

  return shader
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vertexSrc = `
    precision highp float;
    uniform mat4 u_matrix;
    attribute vec3 a_pos;
    void main() {
      gl_Position = u_matrix * vec4(a_pos, 1.0);
    }
  `

  const fragmentSrc = `
    precision highp float;
    uniform vec4 u_color;
    void main() {
      gl_FragColor = u_color;
    }
  `

  const vs = createShader(gl, gl.VERTEX_SHADER, vertexSrc)
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentSrc)

  const program = gl.createProgram()
  if (!program) {
    throw new Error('Failed to create program')
  }

  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? 'unknown link error'
    gl.deleteProgram(program)
    throw new Error(log)
  }

  return program
}

export class RoofMeshLayer implements maplibregl.CustomLayerInterface {
  id: string
  type = 'custom' as const
  renderingMode = '3d' as const

  private mesh: RoofMeshData | null = null
  private map: maplibregl.Map | null = null
  private gl: (WebGLRenderingContext | WebGL2RenderingContext) | null = null
  private program: WebGLProgram | null = null
  private buffer: WebGLBuffer | null = null
  private vertexCount = 0

  constructor(id = 'roof-mesh-layer') {
    this.id = id
  }

  onAdd(map: maplibregl.Map, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.map = map
    this.gl = gl
    this.program = createProgram(gl)
    this.buffer = gl.createBuffer()
    this.uploadBuffer()
  }

  onRemove(): void {
    if (this.gl && this.buffer) {
      this.gl.deleteBuffer(this.buffer)
    }
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program)
    }

    this.buffer = null
    this.program = null
    this.gl = null
    this.map = null
    this.vertexCount = 0
  }

  setMesh(mesh: RoofMeshData | null): void {
    this.mesh = mesh
    this.uploadBuffer()
  }

  render(gl: WebGLRenderingContext | WebGL2RenderingContext, options: maplibregl.CustomRenderMethodInput): void {
    if (!this.program || !this.buffer || this.vertexCount === 0) {
      return
    }

    gl.useProgram(this.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)

    const aPos = gl.getAttribLocation(this.program, 'a_pos')
    const uMatrix = gl.getUniformLocation(this.program, 'u_matrix')
    const uColor = gl.getUniformLocation(this.program, 'u_color')

    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0)

    gl.uniformMatrix4fv(uMatrix, false, options.modelViewProjectionMatrix)
    gl.uniform4f(uColor, 0.93, 0.2, 0.2, 0.78)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.DEPTH_TEST)

    gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount)
  }

  private uploadBuffer(): void {
    if (!this.map || !this.gl || !this.buffer || !this.mesh) {
      this.vertexCount = 0
      return
    }

    const coords: number[] = []

    for (let i = 0; i < this.mesh.triangleIndices.length; i += 1) {
      const idx = this.mesh.triangleIndices[i]
      const vertex = this.mesh.vertices[idx]
      const merc = maplibregl.MercatorCoordinate.fromLngLat({ lng: vertex.lon, lat: vertex.lat }, vertex.z)
      coords.push(merc.x, merc.y, merc.z)
    }

    const data = new Float32Array(coords)

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.DYNAMIC_DRAW)

    this.vertexCount = this.mesh.triangleIndices.length

    this.map.triggerRepaint()
  }
}
