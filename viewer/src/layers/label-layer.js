import { GrayscaleBitmapLayer as VizarrGrayscaleBitmapLayer } from '@hms-dbmi/vizarr/src/layers/label-layer';
import * as utils from '@hms-dbmi/vizarr/src/utils';
import { TileLayer } from 'deck.gl';
import { clamp, Matrix4 } from 'math.gl';

class GrayscaleBitmapLayer extends VizarrGrayscaleBitmapLayer {
  static layerName = 'GrayscaleBitmapLayer';

  getPickingInfo({ info, mode }) {
    // Get label value
    if (!info.coordinate) {
      return info;
    }
    const { pixelData, bounds } = this.props;
    const { data, width, height } = pixelData;
    let [x, y] = info.coordinate;
    if (!Matrix4.IDENTITY.equals(info.layer.props.modelMatrix)) {
      [x, y] = info.layer.props.modelMatrix.invert().transformPoint([x, y]);
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
        getTileData: [loader, selection, modelMatrix],
      },
      async getTileData({ index, signal, bbox }) {
        const { x, y, z } = index;
        const resolution = resolutions[Math.round(-z)];
        const request = { x, y, signal, selection: selection };
        let { data, width, height } = await resolution.getTile(request);
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
    });
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
