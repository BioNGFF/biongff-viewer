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
import LinearProgress from '@mui/material/LinearProgress';
import DeckGL, { OrthographicView } from 'deck.gl';
import { Matrix4 } from 'math.gl';

import { useSourceData } from '../hooks';
import { Controller } from './Controller/Controller';
import { LabelLayer } from '../layers/label-layer';

const LayerStateMap = {
  image: ImageLayer,
  grid: GridLayer,
  multiscale: MultiscaleImageLayer,
};

export const Viewer = ({
  sources,
  channelAxis = [],
  isLabel = [],
  modelMatrices = [],
}) => {
  const deckRef = useRef(null);
  const [viewState, setViewState] = useState(null);
  const [configs] = useState(
    sources.map((source, index) => ({
      source: source,
      ...(channelAxis?.[index]
        ? { channel_axis: parseInt(channelAxis[index]) }
        : {}),
    })),
  );

  const {
    sourceData,
    errors: sourceErrors,
    isLoading,
  } = useSourceData(configs);
  const [layerStates, setLayerStates] = useState([]);

  useEffect(() => {
    if (!isLoading) {
      sourceErrors.forEach((error, index) => {
        if (error) {
          console.warn(`Error fetching source ${index}`, error);
        }
      });
      const ls = sourceData.map((d, index) => {
        if (!d) return null;
        return initLayerStateFromSource({
          id: `raw-${index}`,
          ...d,
          labels: isLabel?.[index]
            ? [
                // To load standalone label, replicate in source and nest in labels
                // Needs source ImageLayer, LabelLayer has no loader
                {
                  name: 'labels',
                  loader: d.loader,
                },
              ]
            : d.labels,
          model_matrix: modelMatrices?.[index] || d.model_matrix,
        });
      });
      setLayerStates(ls);
    }
  }, [isLabel, isLoading, modelMatrices, sourceData, sourceErrors]);

  const layers = useMemo(() => {
    return layerStates
      .map((layerState, index) => {
        if (!layerState) return null;
        if (layerState?.layerProps?.loader || layerState?.layerProps?.loaders) {
          const { on } = layerState;
          if (isLabel?.[index]) {
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
                        selection:
                          layerState.labels[0].transformSourceSelection(
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
      })
      .flat();
  }, [isLabel, layerStates]);

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

  useEffect(() => {
    if (deckRef.current?.deck && !viewState && layers?.[0]) {
      resetViewState();
    }
  }, [layers, resetViewState, viewState]);

  const getTooltip = ({ layer, index, value }) => {
    if (!layer || !index) {
      return null;
    }
    return {
      text: value,
    };
  };

  const toggleVisibility = (index, label = null) => {
    if (!label) {
      setLayerStates((prev) => {
        return prev.map((state, i) => {
          if (i !== index) return state;
          return {
            ...state,
            on: !state.on,
          };
        });
      });
    } else {
      setLayerStates((prev) => {
        return prev.map((state, i) => {
          if (i !== index) return state;
          return {
            ...state,
            labels: state.labels.map((l) => {
              if (l.layerProps.id !== label) return l;
              return {
                ...l,
                on: !l.on,
              };
            }),
          };
        });
      });
    }
  };

  const setLayerOpacity = (index, label = null, opacity) => {
    if (!label) {
      setLayerStates((prev) => {
        return prev.map((state, i) => {
          if (i !== index) return state;
          return {
            ...state,
            layerProps: {
              ...state.layerProps,
              opacity: opacity,
            },
          };
        });
      });
    } else {
      setLayerStates((prev) => {
        return prev.map((state, i) => {
          if (i !== index) return state;
          return {
            ...state,
            labels: state.labels.map((l) => {
              if (l.layerProps.id !== label) return l;
              return {
                ...l,
                layerProps: {
                  ...l.layerProps,
                  opacity: opacity,
                },
              };
            }),
          };
        });
      });
    }
  };

  const setLayerSelections = (index, selections) => {
    setLayerStates((prev) => {
      return prev.map((state, i) => {
        if (i !== index) return state;
        return {
          ...state,
          layerProps: {
            ...state.layerProps,
            selections: selections,
          },
        };
      });
    });
  };

  const toggleChannelVisibility = (index, channelIndex) => {
    setLayerStates((prev) => {
      return prev.map((state, i) => {
        if (i !== index) return state;
        return {
          ...state,
          layerProps: {
            ...state.layerProps,
            channelsVisible: state.layerProps.channelsVisible.map(
              (visible, j) => {
                if (j !== channelIndex) return visible;
                return !visible;
              },
            ),
          },
        };
      });
    });
  };

  const setChannelContrast = (index, channelIndex, contrastLimits) => {
    setLayerStates((prev) => {
      return prev.map((state, i) => {
        if (i !== index) return state;
        return {
          ...state,
          layerProps: {
            ...state.layerProps,
            contrastLimits: state.layerProps.contrastLimits.map((cl, j) => {
              if (j !== channelIndex) return cl;
              return contrastLimits;
            }),
          },
        };
      });
    });
  };
  const { near, far } = useMemo(() => {
    if (!layers?.length) {
      return { near: 0.1, far: 1000 };
    }

    const zs = layers.flatMap((layer) => {
      const { modelMatrix: matrix } = layer?.props || {};
      if (!matrix) {
        return [];
      }
      const { width, height } = getLayerSize(layers[0]);
      const corners = [
        [0, 0, 0],
        [width, 0, 0],
        [width, height, 0],
        [0, height, 0],
      ].map((corner) => matrix.transformAsPoint(corner)[2]);
      return corners;
    });

    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    return {
      near: maxZ ? -10000 * Math.abs(maxZ) : 0.1,
      far: minZ ? 10000 * Math.abs(minZ) : 1000,
    };
  }, [layers]);

  if (isLoading) {
    return (
      <div>
        <LinearProgress thickness={1} />
      </div>
    );
  }
  return (
    <div>
      <Controller
        sourceData={sourceData}
        layerStates={layerStates}
        resetViewState={resetViewState}
        toggleVisibility={toggleVisibility}
        setLayerOpacity={setLayerOpacity}
        setLayerSelections={setLayerSelections}
        toggleChannelVisibility={toggleChannelVisibility}
        setChannelContrast={setChannelContrast}
      />
      <DeckGL
        ref={deckRef}
        layers={layers}
        viewState={viewState && { ortho: viewState }}
        onViewStateChange={(e) => setViewState(e.viewState)}
        views={[
          new OrthographicView({ id: 'ortho', controller: true, near, far }),
        ]}
        getTooltip={getTooltip}
      />
    </div>
  );
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
