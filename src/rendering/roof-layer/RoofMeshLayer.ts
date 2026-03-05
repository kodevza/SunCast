import maplibregl from 'maplibre-gl'
import type { RoofMeshData } from '../../types/geometry'

const FLOATS_PER_LIT_VERTEX = 6
const LIT_STRIDE_BYTES = FLOATS_PER_LIT_VERTEX * Float32Array.BYTES_PER_ELEMENT
const RENDER_EPSILON_M = 0.05

type Vec3 = [number, number, number]

interface WorldPoint {
  x: number
  y: number
  z: number
}

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
    attribute vec3 a_normal;
    varying vec3 v_normal;
    void main() {
      v_normal = a_normal;
      gl_Position = u_matrix * vec4(a_pos, 1.0);
    }
  `

  const fragmentSrc = `
    precision highp float;
    uniform vec4 u_color;
    uniform vec3 u_light_dir;
    uniform float u_unlit_mix;
    varying vec3 v_normal;

    void main() {
      vec3 normal = normalize(v_normal);
      vec3 lightDir = normalize(u_light_dir);
      float lambert = abs(dot(normal, lightDir));
      float lighting = 0.34 + lambert * 0.66;
      vec3 litColor = u_color.rgb * lighting;
      vec3 finalColor = mix(litColor, u_color.rgb, u_unlit_mix);
      gl_FragColor = vec4(finalColor, u_color.a);
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
  private fillBuffer: WebGLBuffer | null = null
  private wallBuffer: WebGLBuffer | null = null
  private lineBuffer: WebGLBuffer | null = null
  private vertexCount = 0
  private wallVertexCount = 0
  private topLineVertexCount = 0
  private dropLineVertexCount = 0
  private aPosLocation = -1
  private aNormalLocation = -1
  private uMatrixLocation: WebGLUniformLocation | null = null
  private uColorLocation: WebGLUniformLocation | null = null
  private uLightDirLocation: WebGLUniformLocation | null = null
  private uUnlitMixLocation: WebGLUniformLocation | null = null

  constructor(id = 'roof-mesh-layer') {
    this.id = id
  }

  onAdd(map: maplibregl.Map, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.map = map
    this.gl = gl
    this.program = createProgram(gl)
    this.fillBuffer = gl.createBuffer()
    this.wallBuffer = gl.createBuffer()
    this.lineBuffer = gl.createBuffer()
    this.aPosLocation = gl.getAttribLocation(this.program, 'a_pos')
    this.aNormalLocation = gl.getAttribLocation(this.program, 'a_normal')
    this.uMatrixLocation = gl.getUniformLocation(this.program, 'u_matrix')
    this.uColorLocation = gl.getUniformLocation(this.program, 'u_color')
    this.uLightDirLocation = gl.getUniformLocation(this.program, 'u_light_dir')
    this.uUnlitMixLocation = gl.getUniformLocation(this.program, 'u_unlit_mix')
    this.uploadBuffer()
  }

  onRemove(): void {
    if (this.gl && this.fillBuffer) {
      this.gl.deleteBuffer(this.fillBuffer)
    }
    if (this.gl && this.wallBuffer) {
      this.gl.deleteBuffer(this.wallBuffer)
    }
    if (this.gl && this.lineBuffer) {
      this.gl.deleteBuffer(this.lineBuffer)
    }
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program)
    }

    this.fillBuffer = null
    this.wallBuffer = null
    this.lineBuffer = null
    this.program = null
    this.gl = null
    this.map = null
    this.vertexCount = 0
    this.wallVertexCount = 0
    this.topLineVertexCount = 0
    this.dropLineVertexCount = 0
    this.aPosLocation = -1
    this.aNormalLocation = -1
    this.uMatrixLocation = null
    this.uColorLocation = null
    this.uLightDirLocation = null
    this.uUnlitMixLocation = null
  }

  setMesh(mesh: RoofMeshData | null): void {
    this.mesh = mesh
    this.uploadBuffer()
  }

  private drawLitTriangles(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    buffer: WebGLBuffer,
    vertexCount: number,
    color: Vec3,
    alpha: number,
    unlitMix = 0,
  ): void {
    if (
      vertexCount <= 0 ||
      this.aPosLocation < 0 ||
      this.aNormalLocation < 0 ||
      !this.uColorLocation ||
      !this.uUnlitMixLocation
    ) {
      return
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.enableVertexAttribArray(this.aPosLocation)
    gl.vertexAttribPointer(this.aPosLocation, 3, gl.FLOAT, false, LIT_STRIDE_BYTES, 0)
    gl.enableVertexAttribArray(this.aNormalLocation)
    gl.vertexAttribPointer(
      this.aNormalLocation,
      3,
      gl.FLOAT,
      false,
      LIT_STRIDE_BYTES,
      3 * Float32Array.BYTES_PER_ELEMENT,
    )
    gl.uniform4f(this.uColorLocation, color[0], color[1], color[2], alpha)
    gl.uniform1f(this.uUnlitMixLocation, unlitMix)
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount)
  }

  render(gl: WebGLRenderingContext | WebGL2RenderingContext, options: maplibregl.CustomRenderMethodInput): void {
    if (
      !this.program ||
      !this.fillBuffer ||
      !this.wallBuffer ||
      !this.lineBuffer ||
      this.vertexCount === 0 ||
      !this.uMatrixLocation ||
      !this.uLightDirLocation
    ) {
      return
    }

    gl.useProgram(this.program)

    gl.uniformMatrix4fv(this.uMatrixLocation, false, options.modelViewProjectionMatrix)
    gl.uniform3f(this.uLightDirLocation, 0.35, -0.22, 0.91)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.DEPTH_TEST)
    gl.disable(gl.CULL_FACE)

    if (this.wallVertexCount > 0) {
      gl.depthMask(true)
      this.drawLitTriangles(gl, this.wallBuffer, this.wallVertexCount, [0.57, 0.15, 0.15], 0.82)
    }

    gl.depthMask(false)
    this.drawLitTriangles(gl, this.fillBuffer, this.vertexCount, [0.95, 0.29, 0.23], 0.67)

    if (this.topLineVertexCount > 0 && this.aPosLocation >= 0 && this.aNormalLocation >= 0 && this.uColorLocation) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer)
      gl.enableVertexAttribArray(this.aPosLocation)
      gl.vertexAttribPointer(this.aPosLocation, 3, gl.FLOAT, false, 0, 0)
      gl.disableVertexAttribArray(this.aNormalLocation)
      gl.vertexAttrib3f(this.aNormalLocation, 0, 0, 1)
      gl.lineWidth(1)
      gl.uniform4f(this.uColorLocation, 1.0, 0.93, 0.59, 1.0)
      if (this.uUnlitMixLocation) {
        gl.uniform1f(this.uUnlitMixLocation, 1)
      }
      gl.drawArrays(gl.LINE_LOOP, 0, this.topLineVertexCount)
      if (this.dropLineVertexCount > 0) {
        gl.uniform4f(this.uColorLocation, 0.98, 0.8, 0.46, 0.92)
        gl.drawArrays(gl.LINES, this.topLineVertexCount, this.dropLineVertexCount)
      }
    }

    gl.depthMask(true)
  }

  private resetBuffers(): void {
    this.vertexCount = 0
    this.wallVertexCount = 0
    this.topLineVertexCount = 0
    this.dropLineVertexCount = 0
    this.map?.triggerRepaint()
  }

  private uploadBuffer(): void {
    if (!this.map || !this.gl || !this.fillBuffer || !this.wallBuffer || !this.lineBuffer || !this.mesh) {
      this.resetBuffers()
      return
    }

    if (this.mesh.vertices.length < 3) {
      this.resetBuffers()
      return
    }

    const fillLitCoords: number[] = []
    const wallLitCoords: number[] = []
    const lineCoords: number[] = []
    const topWorldVertices: WorldPoint[] = this.mesh.vertices.map((vertex) => {
      const merc = maplibregl.MercatorCoordinate.fromLngLat(
        { lng: vertex.lon, lat: vertex.lat },
        vertex.z + RENDER_EPSILON_M,
      )
      return { x: merc.x, y: merc.y, z: merc.z }
    })
    const baseWorldVertices: WorldPoint[] = this.mesh.vertices.map((vertex) => {
      const merc = maplibregl.MercatorCoordinate.fromLngLat({ lng: vertex.lon, lat: vertex.lat }, 0)
      return { x: merc.x, y: merc.y, z: merc.z }
    })

    for (let i = 0; i < this.mesh.triangleIndices.length; i += 3) {
      const idxA = this.mesh.triangleIndices[i]
      const idxB = this.mesh.triangleIndices[i + 1]
      const idxC = this.mesh.triangleIndices[i + 2]
      if (idxA === undefined || idxB === undefined || idxC === undefined) {
        continue
      }

      const a = topWorldVertices[idxA]
      const b = topWorldVertices[idxB]
      const c = topWorldVertices[idxC]
      if (!a || !b || !c) {
        continue
      }

      const normal = computeTriangleNormal(a, b, c)
      pushLitVertex(fillLitCoords, a, normal)
      pushLitVertex(fillLitCoords, b, normal)
      pushLitVertex(fillLitCoords, c, normal)
    }

    for (let i = 0; i < this.mesh.vertices.length; i += 1) {
      const topCurrent = topWorldVertices[i]
      const topNext = topWorldVertices[(i + 1) % this.mesh.vertices.length]
      const baseCurrent = baseWorldVertices[i]
      const baseNext = baseWorldVertices[(i + 1) % this.mesh.vertices.length]

      const firstWallNormal = computeTriangleNormal(topCurrent, topNext, baseNext)
      pushLitVertex(wallLitCoords, topCurrent, firstWallNormal)
      pushLitVertex(wallLitCoords, topNext, firstWallNormal)
      pushLitVertex(wallLitCoords, baseNext, firstWallNormal)

      const secondWallNormal = computeTriangleNormal(topCurrent, baseNext, baseCurrent)
      pushLitVertex(wallLitCoords, topCurrent, secondWallNormal)
      pushLitVertex(wallLitCoords, baseNext, secondWallNormal)
      pushLitVertex(wallLitCoords, baseCurrent, secondWallNormal)
    }

    for (const topVertex of topWorldVertices) {
      lineCoords.push(topVertex.x, topVertex.y, topVertex.z)
    }
    for (let i = 0; i < topWorldVertices.length; i += 1) {
      const topVertex = topWorldVertices[i]
      const baseVertex = baseWorldVertices[i]
      lineCoords.push(topVertex.x, topVertex.y, topVertex.z)
      lineCoords.push(baseVertex.x, baseVertex.y, baseVertex.z)
    }

    const fillData = new Float32Array(fillLitCoords)
    const wallData = new Float32Array(wallLitCoords)
    const lineData = new Float32Array(lineCoords)

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.fillBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, fillData, this.gl.DYNAMIC_DRAW)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.wallBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, wallData, this.gl.DYNAMIC_DRAW)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.lineBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, lineData, this.gl.DYNAMIC_DRAW)

    this.vertexCount = fillLitCoords.length / FLOATS_PER_LIT_VERTEX
    this.wallVertexCount = wallLitCoords.length / FLOATS_PER_LIT_VERTEX
    this.topLineVertexCount = topWorldVertices.length
    this.dropLineVertexCount = topWorldVertices.length * 2

    this.map.triggerRepaint()
  }
}

function normalizeVec3(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
  if (len < 1e-12) {
    return [0, 0, 1]
  }
  return [v[0] / len, v[1] / len, v[2] / len]
}

function computeTriangleNormal(a: WorldPoint, b: WorldPoint, c: WorldPoint): Vec3 {
  const ab: Vec3 = [b.x - a.x, b.y - a.y, b.z - a.z]
  const ac: Vec3 = [c.x - a.x, c.y - a.y, c.z - a.z]
  return normalizeVec3([
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ])
}

function pushLitVertex(target: number[], point: WorldPoint, normal: Vec3): void {
  target.push(point.x, point.y, point.z, normal[0], normal[1], normal[2])
}
