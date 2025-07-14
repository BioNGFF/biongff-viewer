import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';

import { ImageLayer, MultiscaleImageLayer } from '@hms-dbmi/viv';
import { initLayerStateFromSource } from '@hms-dbmi/vizarr/src/io';
import { GridLayer } from '@hms-dbmi/vizarr/src/layers/grid-layer';
import {
  isGridLayerProps,
  isInterleaved,
  resolveLoaderFromLayerProps,
} from '@hms-dbmi/vizarr/src/utils';
import DeckGL, { OrthographicView } from 'deck.gl';
import { Matrix4 } from 'math.gl';

import { useSourceData } from '../hooks';
import { Controller } from './Controller';
import { LabelLayer } from '../layers/label-layer';

const LayerStateMap = {
  image: ImageLayer,
  grid: GridLayer,
  multiscale: MultiscaleImageLayer,
};

export const Viewer = ({ source, channelAxis = null, isLabel = false }) => {
  const deckRef = useRef(null);
  const [viewState, setViewState] = useState(null);
  const [config] = useState({
    source: source || null,
    ...(channelAxis ? { channel_axis: parseInt(channelAxis) } : {}),
  });

  const { sourceData, error: sourceError } = useSourceData(config);
  const [layerState, setLayerState] = useState(null);

  useEffect(() => {
    if (sourceData) {
      if (isLabel) {
        // To load standalone label, replicate in source and nest in labels
        // Needs source ImageLayer, LabelLayer has no loader
        setLayerState({
          ...initLayerStateFromSource({
            id: 'raw',
            ...sourceData,
            labels: [
              {
                name: 'labels',
                loader: sourceData.loader,
              },
            ],
          }),
        });
        return;
      }
      setLayerState(
        initLayerStateFromSource({
          id: 'raw',
          ...sourceData,
        }),
      );
    }
  }, [isLabel, sourceData]);

  const layers = useMemo(() => {
    if (layerState?.layerProps?.loader || layerState?.layerProps?.loaders) {
      const { on } = layerState;
      if (isLabel) {
        // @TODO: fix how controller lists layers
        return [
          new MultiscaleImageLayer({
            ...layerState.layerProps,
            visible: false,
            excludeBackground: true,
          }),
          on
            ? new LabelLayer({
                ...layerState.labels[0].layerProps,
                modelMatrix: layerState.layerProps.modelMatrix,
                selection: layerState.labels[0].transformSourceSelection(
                  layerState.layerProps.selections[0],
                ),
                pickable: true,
              })
            : null,
        ];
      }
      return [
        new LayerStateMap[layerState.kind]({
          ...layerState.layerProps,
          visible: on,
          pickable: false,
          ...(layerState.kind === 'multiscale'
            ? { excludeBackground: true }
            : {}),
        }),
        ...(layerState.labels?.length
          ? layerState.labels?.map((label) => {
              const { on: labelOn } = label;
              return labelOn
                ? new LabelLayer({
                    ...label.layerProps,
                    modelMatrix: layerState.layerProps.modelMatrix,
                    selection: layerState.labels[0].transformSourceSelection(
                      layerState.layerProps.selections[0],
                    ),
                    pickable: true,
                  })
                : null;
            })
          : []),
      ];
    }
    return [];
  }, [isLabel, layerState]);

  const resetViewState = useCallback(() => {
    const { deck } = deckRef.current;
    setViewState(
      fitImageToViewport({
        image: getLayerSize(layers?.[0]),
        viewport: deck,
        padding: deck.width < 400 ? 10 : deck.width < 600 ? 30 : 50,
        matrix: layers?.[0]?.props.modelMatrix,
      }),
    );
  }, [layers]);

  if (deckRef.current?.deck && !viewState && layers?.[0]) {
    resetViewState();
  }

  const getTooltip = ({ layer, index, value }) => {
    if (!layer || !index) {
      return null;
    }
    return {
      text: value,
    };
  };

  const toggleVisibility = (label = null) => {
    if (!label) {
      setLayerState((prev) => ({
        ...prev,
        on: !prev.on,
      }));
    } else {
      setLayerState((prev) => ({
        ...prev,
        labels: prev.labels.map((l) => {
          if (l.layerProps.id === label) {
            return {
              ...l,
              on: !l.on,
            };
          }
          return l;
        }),
      }));
    }
  };

  const rotate90 = (ccw = false) => {
    const { height, width } = getLayerSize(layers[0]);
    const center = [width / 2, height / 2, 0];
    setLayerState((prev) => {
      const rotatedMatrix = prev.layerProps.modelMatrix
        .clone()
        .translate(center)
        .rotateZ((Math.PI / 2) * (ccw ? -1 : 1))
        .translate(center.map((c) => -c));
      return {
        ...prev,
        layerProps: {
          ...prev.layerProps,
          modelMatrix: rotatedMatrix,
        },
      };
    });
  };

  const translate = (x, y) => {
    setLayerState((prev) => {
      const translatedMatrix = new Matrix4()
        .translate([x, y, 0])
        .multiplyRight(prev.layerProps.modelMatrix)
        .clone();
      return {
        ...prev,
        layerProps: {
          ...prev.layerProps,
          modelMatrix: translatedMatrix,
        },
      };
    });
  };

  const setIdentityMatrix = () => {
    setLayerState((prev) => {
      return {
        ...prev,
        layerProps: {
          ...prev.layerProps,
          modelMatrix: new Matrix4().identity(),
        },
      };
    });
  };

  if (sourceError) {
    return (
      <div className="alert alert-danger" role="alert">
        {sourceError.message}
      </div>
    );
  } else {
    return (
      <div>
        <Controller
          layerState={layerState}
          resetViewState={resetViewState}
          toggleVisibility={toggleVisibility}
          rotate90={rotate90}
          translate={translate}
          setIdentityMatrix={setIdentityMatrix}
        />
        <div className="viewer-matrix">
          {layers?.[0]?.props.modelMatrix
            ? `[${layers[0].props.modelMatrix.join(', ')}]`
            : ''}
        </div>
        <DeckGL
          ref={deckRef}
          layers={layers}
          viewState={viewState && { ortho: viewState }}
          onViewStateChange={(e) => setViewState(e.viewState)}
          views={[new OrthographicView({ id: 'ortho', controller: true })]}
          getTooltip={getTooltip}
        />
      </div>
    );
  }
};

// from vizarr Viewer
const getLayerSize = ({ props }) => {
  const loader = resolveLoaderFromLayerProps(props);
  const [baseResolution, maxZoom] = Array.isArray(loader)
    ? [loader[0], loader.length]
    : [loader, 0];
  const interleaved = isInterleaved(baseResolution.shape);
  let [height, width] = baseResolution.shape.slice(interleaved ? -3 : -2);
  if (isGridLayerProps(props)) {
    // TODO: Don't hardcode spacer size. Probably best to inspect the deck.gl Layers rather than
    // the Layer Props.
    const spacer = 5;
    height = (height + spacer) * props.rows;
    width = (width + spacer) * props.columns;
  }
  return { height, width, maxZoom };
};

// from vizarr utils
const fitImageToViewport = ({
  image,
  viewport,
  padding,
  matrix = new Matrix4().identity(),
}) => {
  const corners = [
    [0, 0, 0],
    [image.width, 0, 0],
    [image.width, image.height, 0],
    [0, image.height, 0],
  ].map((corner) => matrix.transformAsPoint(corner));

  const minX = Math.min(...corners.map((p) => p[0]));
  const maxX = Math.max(...corners.map((p) => p[0]));
  const minY = Math.min(...corners.map((p) => p[1]));
  const maxY = Math.max(...corners.map((p) => p[1]));

  const availableWidth = viewport.width - 2 * padding;
  const availableHeight = viewport.height - 2 * padding;

  return {
    zoom: Math.log2(
      Math.min(
        availableWidth / (maxX - minX), // scaleX
        availableHeight / (maxY - minY), // scaleY // Fix minY
      ),
    ),
    target: [(minX + maxX) / 2, (minY + maxY) / 2],
  };
};
