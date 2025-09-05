import { GrayscaleBitmapLayer as VizarrGrayscaleBitmapLayer } from '@hms-dbmi/vizarr/src/layers/label-layer';
import * as utils from '@hms-dbmi/vizarr/src/utils';
import { _Tileset2D as Tileset2D, TileLayer } from 'deck.gl';
import { clamp, Matrix4 } from 'math.gl';

import { transformBox } from '../utils';

// Extend Tileset2D to use modelMatrix in isTileVisible
// so picking works in the transformed tiles
class LabelTileset2D extends Tileset2D {
  isTileVisible(tile, cullRect, modelMatrix = null) {
    if (!tile.isVisible) {
      return false;
    }

    if (cullRect && this._viewport) {
      const boundsArr = this._getCullBounds({
        viewport: this._viewport,
        z: this._zRange,
        cullRect,
      });
      let { bbox } = tile;
      for (const [minX, minY, maxX, maxY] of boundsArr) {
        let overlaps;
        if ('west' in bbox) {
          overlaps =
            bbox.west < maxX &&
            bbox.east > minX &&
            bbox.south < maxY &&
            bbox.north > minY;
        } else {
          if (modelMatrix && !Matrix4.IDENTITY.equals(modelMatrix)) {
            const [left, top, right, bottom] = transformBox(
              [bbox.left, bbox.top, bbox.right, bbox.bottom],
              modelMatrix,
            );
            bbox = { left, top, right, bottom };
          }
          // top/bottom could be swapped depending on the indexing system
          const y0 = Math.min(bbox.top, bbox.bottom);
          const y1 = Math.max(bbox.top, bbox.bottom);
          overlaps =
            bbox.left < maxX && bbox.right > minX && y0 < maxY && y1 > minY;
        }
        if (overlaps) {
          return true;
        }
      }
      return false;
    }
    return true;
  }
}

class GrayscaleBitmapLayer extends VizarrGrayscaleBitmapLayer {
  static layerName = 'GrayscaleBitmapLayer';

  getPickingInfo({ info }) {
    // Get label value
    if (!info.coordinate) {
      return info;
    }
    const { pixelData, bounds, modelMatrixInverse } = this.props;
    const { data, width, height } = pixelData;
    let [x, y] = info.coordinate;
    if (modelMatrixInverse && !Matrix4.IDENTITY.equals(modelMatrixInverse)) {
      [x, y] = modelMatrixInverse.transformPoint([x, y]);
    }
    const [left, bottom, right, top] = bounds;

    if (right - left === 0 || top - bottom === 0) {
      console.log('Picking info has zero-sized bounds');
      return info;
    }

    const normX = (x - left) / (right - left);
    const normY = (y - bottom) / (top - bottom);
    const pixelX = Math.floor(normX * width);
    const pixelY = Math.floor((1 - normY) * height);
    const clampedX = clamp(pixelX, 0, width);
    const clampedY = clamp(pixelY, 0, height);

    const index = clampedY * width + clampedX;

    if (index < 0 || index >= data.length) {
      return info;
    }
    const value = data[index];
    info = {
      ...info,
      value: value,
    };
    return info;
  }

  // Temporary workaround for ANGLE bug https://issues.angleproject.org/issues/401546698
  // "Error during validation: Two textures of different types use the same sampler location."
  // Force grayscaleTexture to float32 to use sampler2D
  getShaders() {
    // const sampler = (
    //   {
    //     Uint8Array: "usampler2D",
    //     Uint16Array: "usampler2D",
    //     Uint32Array: "usampler2D",
    //     Int8Array: "isampler2D",
    //     Int16Array: "isampler2D",
    //     Int32Array: "isampler2D",
    //   }
    // )[typedArrayConstructorName(this.props.pixelData.data)];
    const sampler = 'sampler2D'; // Use sampler2D for ANGLE bug workaround
    // replace the builtin fragment shader with our own
    return {
      ...super.getShaders(),
      fs: `\
#version 300 es
#define SHADER_NAME grayscale-bitmap-layer-fragment-shader

precision highp float;
precision highp int;
precision highp ${sampler};

uniform ${sampler} grayscaleTexture;
uniform sampler2D colorTexture;
uniform float colorTextureWidth;
uniform float colorTextureHeight;
uniform float opacity;

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
  int index = int(texture(grayscaleTexture, vTexCoord).r);
  if (index < 0) discard;
  float x = (mod(float(index), colorTextureWidth) + 0.5) / colorTextureWidth;
  float y = (floor(float(index) / colorTextureWidth) + 0.5) / colorTextureHeight;
  vec2 uv = vec2(x, y);
  vec3 color = texture(colorTexture, uv).rgb;
  fragColor = vec4(color, ((index > 0) ? 1.0 : 0.0) * opacity);
}
`,
    };
  }

  updateState({ props, oldProps, changeFlags, ...rest }) {
    super.updateState({ props, oldProps, changeFlags, ...rest });
    if (props.pixelData !== oldProps.pixelData) {
      this.state.texture?.destroy();
      this.setState({
        texture: this.context.device.createTexture({
          width: props.pixelData.width,
          height: props.pixelData.height,
          data: new Float32Array(props.pixelData.data), // Force float32 for ANGLE bug workaround
          dimension: '2d',
          mipmaps: false,
          sampler: {
            minFilter: 'nearest',
            magFilter: 'nearest',
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
          },
          format: 'r32float', // Force float32 for ANGLE bug workaround
        }),
      });
    }
  }
}

export class LabelLayer extends TileLayer {
  static layerName = 'LabelLayer';
  // @ts-expect-error - only way to extend the base state type
  state = {};

  constructor(props) {
    const {
      id,
      loader,
      selection,
      opacity,
      modelMatrix,
      colors,
      ...restTileLayerProps
    } = props;

    const resolutions = loader;
    const dimensions = {
      height: resolutions[0].shape.at(-2),
      width: resolutions[0].shape.at(-1),
    };
    utils.assert(dimensions.width && dimensions.height);
    const tileSize = getTileSizeForResolutions(resolutions);

    super({
      TilesetClass: LabelTileset2D,
      id: `labels-${id}`,
      extent: [0, 0, dimensions.width, dimensions.height],
      tileSize: tileSize,
      minZoom: Math.round(-(resolutions.length - 1)),
      opacity: opacity,
      maxZoom: 0,
      modelMatrix: modelMatrix,
      colors: colors,
      zoomOffset: Math.round(
        Math.log2(modelMatrix ? modelMatrix.getScale()[0] : 1),
      ),
      updateTriggers: {
        getTileData: [loader, selection],
      },
      async getTileData({ index, signal }) {
        const { x, y, z } = index;
        const resolution = resolutions[Math.round(-z)];
        const request = { x, y, signal, selection: selection };
        let { data, width, height } = await resolution.getTile(request);
        if (signal.aborted) return null;
        utils.assert(
          !(data instanceof Float32Array) && !(data instanceof Float64Array),
          `The pixels of labels MUST be integer data types, got ${JSON.stringify(
            resolution.dtype,
          )}`,
        );
        return { data, width, height };
      },
      ...restTileLayerProps,
    });
  }

  renderSubLayers(params) {
    const { tile, data, pickable = false, ...props } = params;
    const [[left, bottom], [right, top]] = tile.boundingBox;
    utils.assert(props.extent, 'missing extent');
    const [minX, minY, width, height] = props.extent;
    if (right <= minX || left >= width || top <= minY || bottom >= height) {
      // Tile is outside the extent, skip rendering
      return null;
    }
    return new GrayscaleBitmapLayer({
      id: `tile-${tile.index.x}.${tile.index.y}.${tile.index.z}-${props.id}`,
      pixelData: data,
      opacity: props.opacity,
      modelMatrix: props.modelMatrix,
      colorTexture: this.state.colorTexture,
      bounds: [
        clamp(left, 0, width),
        clamp(top, 0, height),
        clamp(right, 0, width),
        clamp(bottom, 0, height),
      ],
      // For underlying class
      image: new ImageData(data.width, data.height),
      pickable: pickable,
      modelMatrixInverse:
        props.modelMatrix && props.modelMatrix.clone().invert(),
    });
  }

  filterSubLayer({ layer, cullRect }) {
    const { tile } = layer.props;
    return (
      this.state.tileset &&
      this.state.tileset.isTileVisible(tile, cullRect, this.props.modelMatrix)
    );
  }

  updateState({ props, oldProps, changeFlags, ...rest }) {
    super.updateState({ props, oldProps, changeFlags, ...rest });
    // we make the colorTexture on this layer so we can share it amoung all the sublayers
    if (props.colors !== oldProps.colors || !this.state.colorTexture) {
      this.state.colorTexture?.destroy();
      const colorTexture = createColorTexture({
        source: props.colors,
        maxTextureDimension2D: this.context.device.limits.maxTextureDimension2D,
      });
      this.setState({
        colorTexture: this.context.device.createTexture({
          width: colorTexture.width,
          height: colorTexture.height,
          data: colorTexture.data,
          dimension: '2d',
          mipmaps: false,
          sampler: {
            minFilter: 'nearest',
            magFilter: 'nearest',
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
          },
          format: 'rgba8unorm',
        }),
      });
    }
  }
}

function getTileSizeForResolutions(resolutions) {
  const tileSize = resolutions[0].tileSize;
  utils.assert(
    resolutions.every((resolution) => resolution.tileSize === tileSize),
    'resolutions must all have the same tile size',
  );
  return tileSize;
}

function createColorTexture(options) {
  const { source, maxTextureDimension2D } = options;
  const fallback = {
    data: DEFAULT_COLOR_TEXTURE,
    width: DEFAULT_COLOR_TEXTURE.length / 4,
    height: 1,
  };

  if (!source) {
    return fallback;
  }

  // pack the colors into a 2D texture
  const size = Math.max(...source.map((e) => e.labelValue)) + 1;
  const width = Math.min(size, maxTextureDimension2D);
  const height = Math.ceil(size / width);

  if (width > maxTextureDimension2D || height > maxTextureDimension2D) {
    if (!SEEN_LUTS.has(source)) {
      console.warn(
        '[vizarr] Skipping color palette from OME-NGFF `image-label` source: max texture dimension limit.',
      );
      SEEN_LUTS.add(source);
    }
    return fallback;
  }

  const data = new Uint8Array(width * height * 4);
  for (const { labelValue, rgba } of source) {
    const x = labelValue % width;
    const y = Math.floor(labelValue / width);
    const texIndex = (y * width + x) * 4;
    data[texIndex] = rgba[0];
    data[texIndex + 1] = rgba[1];
    data[texIndex + 2] = rgba[2];
    data[texIndex + 3] = rgba[3];
  }

  return { data, width, height };
}

const SEEN_LUTS = new WeakSet();

// From Vitessce https://github.com/vitessce/vitessce/blob/03c6d5d843640982e984a0e309f1ba1807085128/packages/utils/other-utils/src/components.ts#L50-L67
const DEFAULT_COLOR_TEXTURE = Uint8Array.from(
  [
    [0, 73, 73],
    [0, 146, 146],
    [255, 109, 182],
    [255, 182, 219],
    [73, 0, 146],
    [0, 109, 219],
    [182, 109, 255],
    [109, 182, 255],
    [182, 219, 255],
    [146, 0, 0],
    [146, 72, 0],
    [219, 109, 0],
    [36, 255, 36],
    [255, 255, 109],
    [255, 255, 255],
  ].flatMap((color) => [...color, 255]),
);
