import maplibregl from 'maplibre-gl'
import * as THREE from 'three'
import type { RoofMeshData } from '../../../../../types/geometry'
import type { BinaryShadedCell } from '../../../../analysis/analysis.types'
import type { ComputeRoofShadeGridResult } from '../../../../../geometry/shading'
import { acquireSharedThreeRenderer, releaseSharedThreeRenderer } from '../../../../../rendering/shared/sharedThreeRenderer'
import {
  buildProjectedBinaryShadeOverlayGeometry,
  buildProjectedBinaryShadeOverlayGeometryFromCells,
} from '../../../../../rendering/shared/projectedBinaryShadeOverlay'

const DEFAULT_SHADE_COLOR_HEX = 0x6b7280
const DEFAULT_SHADE_OPACITY = 0.5

function clearGroup(group: THREE.Group): void {
  while (group.children.length > 0) {
    const child = group.children[group.children.length - 1]
    group.remove(child)
    if (child instanceof THREE.Mesh && child.geometry) {
      child.geometry.dispose()
    }
  }
}

export class ProjectedBinaryShadeLayer implements maplibregl.CustomLayerInterface {
  id: string
  type = 'custom' as const
  renderingMode = '3d' as const

  private map: maplibregl.Map | null = null
  private gl: (WebGLRenderingContext | WebGL2RenderingContext) | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.Camera | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private group: THREE.Group | null = null
  private material: THREE.MeshBasicMaterial | null = null
  private roofMeshes: RoofMeshData[] = []
  private shadedCells: BinaryShadedCell[] = []
  private shadeResult: ComputeRoofShadeGridResult | null = null
  private zExaggeration = 1
  private visible = false
  private layerAnchorX = 0
  private layerAnchorY = 0
  private layerRebaseMatrix = new THREE.Matrix4()

  constructor(id = 'roof-shaded-cells-layer') {
    this.id = id
  }

  onAdd(map: maplibregl.Map, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.map = map
    this.gl = gl
    this.scene = new THREE.Scene()
    this.camera = new THREE.Camera()
    this.group = new THREE.Group()
    this.scene.add(this.group)
    this.material = new THREE.MeshBasicMaterial({
      color: DEFAULT_SHADE_COLOR_HEX,
      transparent: true,
      opacity: DEFAULT_SHADE_OPACITY,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
    this.renderer = acquireSharedThreeRenderer(map, gl)
    this.rebuildGeometry()
  }

  onRemove(): void {
    if (this.group) {
      clearGroup(this.group)
    }
    this.material?.dispose()
    if (this.gl) {
      releaseSharedThreeRenderer(this.gl)
    }

    this.map = null
    this.gl = null
    this.scene = null
    this.camera = null
    this.renderer = null
    this.group = null
    this.material = null
  }

  setRoofMeshes(meshes: RoofMeshData[]): void {
    this.roofMeshes = meshes
    this.rebuildGeometry()
  }

  setShadedCells(cells: BinaryShadedCell[]): void {
    this.shadedCells = cells
    this.shadeResult = null
    this.rebuildGeometry()
  }

  setShadeResult(result: ComputeRoofShadeGridResult | null): void {
    this.shadeResult = result
    this.shadedCells = []
    this.rebuildGeometry()
  }

  setZExaggeration(zExaggeration: number): void {
    this.zExaggeration = Math.max(0.1, zExaggeration)
    this.rebuildGeometry()
  }

  setVisible(visible: boolean): void {
    this.visible = visible
    this.map?.triggerRepaint()
  }

  render(_gl: WebGLRenderingContext | WebGL2RenderingContext, options: maplibregl.CustomRenderMethodInput): void {
    if (!this.visible || !this.renderer || !this.scene || !this.camera) {
      return
    }

    const projectionMatrix = options.defaultProjectionData?.mainMatrix ?? options.modelViewProjectionMatrix
    this.camera.projectionMatrix.fromArray(projectionMatrix as ArrayLike<number>)
    this.layerRebaseMatrix.makeTranslation(this.layerAnchorX, this.layerAnchorY, 0)
    this.camera.projectionMatrix.multiply(this.layerRebaseMatrix)
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert()
    this.camera.matrixWorld.identity()
    this.camera.matrixWorldInverse.identity()

    const canvas = this.map?.getCanvas()
    if (canvas) {
      this.renderer.setViewport(0, 0, canvas.width, canvas.height)
    }
    this.renderer.resetState()
    this.renderer.render(this.scene, this.camera)
  }

  private rebuildGeometry(): void {
    if (!this.group || !this.material) {
      return
    }

    clearGroup(this.group)

    const overlay = this.shadeResult
      ? buildProjectedBinaryShadeOverlayGeometry(this.roofMeshes, this.shadeResult, this.zExaggeration)
      : buildProjectedBinaryShadeOverlayGeometryFromCells(this.roofMeshes, this.shadedCells, this.zExaggeration)

    if (!overlay) {
      this.layerAnchorX = 0
      this.layerAnchorY = 0
      this.map?.triggerRepaint()
      return
    }

    this.layerAnchorX = overlay.anchorX
    this.layerAnchorY = overlay.anchorY

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(overlay.positions, 3))
    geometry.setIndex(new THREE.BufferAttribute(overlay.indices, 1))
    geometry.computeVertexNormals()

    const mesh = new THREE.Mesh(geometry, this.material)
    mesh.position.set(0, 0, 0)
    mesh.frustumCulled = false
    this.group.add(mesh)
    this.map?.triggerRepaint()
  }
}
