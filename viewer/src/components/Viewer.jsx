import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';

import { ImageLayer, MultiscaleImageLayer, ScaleBarLayer } from '@hms-dbmi/viv';
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
  channelAxis = null,
  isLabel = null,
  modelMatrices = null,
  colors = null,
  hrefView,
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
      if (Array.isArray(sourceErrors)) {
        sourceErrors.forEach((error, index) => {
          if (error) {
            console.warn(`Error fetching source ${index}`, error);
          }
        });
      }
  
      let nameList = [];
      const ls = sourceData.map((d, index) => {
        if (!d) return null;
        let name = d.name ?? "raw", copyIndex = nameList.reduce((acc, x) => acc + (name == x ? 1 : 0), 0);
        nameList.push(name);
        if(copyIndex) name += "-" + String(copyIndex);
        return initLayerStateFromSource({
          id: name,
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
                    colors:
                      colors?.[index] || layerState.labels[0].layerProps.colors,
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
                        colors: colors?.[index] || label.layerProps.colors,
                      })
                    : null;
                })
              : []),
              new LayerStateMap[layerState.kind]({
              ...layerState.layerProps,
              id: layerState.layerProps.id + "-OVERVIEW",
              visible: true,
              pickable: false,
              ...(layerState.kind === 'multiscale'
                ? { excludeBackground: true }
                : {}),
            })
          ];
        }
        return [];
      })
      .flat();
  }, [colors, isLabel, layerStates]);

  const units = {"micrometer" : "um", "nanometer" : "nm", "millimeter": "mm"}

  const deckLayers = useMemo(() => {
    if (sourceData.length > 1 || !layers.length || !viewState) {
      return layers;
    }
    if (layers[0].props.loader?.[0]?.meta?.physicalSizes?.x) {
      const { size, unit } = layers[0].props.loader[0].meta.physicalSizes.x;
      if(!units[unit]) return layers;
      const scalebar = new ScaleBarLayer({
        id: 'scalebar',
        size: size / layers[0].props.modelMatrix[0],
        unit: units[unit],
        viewState: viewState,
        snap: true
      });
      return [...layers, scalebar];
    }
    return layers;
  }, [layers, sourceData.length, viewState]);

  const layerFilter = useCallback(({layer, viewport}) => {
    return (viewport.id == 'overview') == (layer.id.slice(-9) == '-OVERVIEW');
  })

  const resetViewState = useCallback(() => {
    const { deck } = deckRef.current;
    setViewState({
      ...fitImageToViewport({
        image: getLayerSize(layers?.[0]),
        viewport: deck,
        padding: deck.width < 400 ? 10 : deck.width < 600 ? 30 : 50,
        matrix: layers?.[0]?.props.modelMatrix,
      }),
      width: deck.width,
      height: deck.height,
    });
  }, [layers]);

  const setViewFromHref = useCallback(() => {
    const { deck } = deckRef.current;
    setViewState({
      target: hrefView.target,
      zoom: hrefView.zoom,
      width: deck.width,
      height: deck.height,
    });
  });

  useEffect(() => {
    if (deckRef.current?.deck && !viewState && layers?.[0]){
      if(!hrefView) resetViewState();
      else setViewFromHref();
    }
  }, [layers, resetViewState, setViewFromHref, viewState]);

  const getTooltip = ({ layer, index, label, value }) => {
    if (!layer || !index || !label) {
      return null;
    }
    return {
      text:
        value !== null && value !== undefined
          ? `${label}: ${value}`
          : `${label}`,
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

  const [overviewOn, toggleOverview] = React.useReducer((v) => !v, false);

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

  const copyLink = () => {
      const link = new URL(window.location.href)
      link.searchParams.set("viewState", JSON.stringify(viewState));
      const text = decodeURIComponent(link.href)
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed"; // Prevent scrolling to bottom of page
      textarea.style.opacity = "0"; // Make it invisible
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
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

  let moveOnOverview = () => {};

  const views = [new OrthographicView({ id: 'ortho', controller: true, near, far })];
  const div_map_props = [];
  if(overviewOn && viewState){
    const matrix_transform = (layers?.[0]?.props.modelMatrix ?? new Matrix4().identity());
    const [width, height] =  matrix_transform.transformAsPoint([getLayerSize(layers[0]).width,getLayerSize(layers[0]).height]);

    const overview_width = 0.2 * viewState.width, overview_height = overview_width * height / width;

    div_map_props.push({position: "absolute", top: "20px", right: "20px", width: overview_width, height: overview_height, border: "3px solid yellow"});

    const padding = deckRef.current.deck.width < 400 ? 10 : deckRef.current.deck.width < 600 ? 30 : 50;
    const scale = Math.pow(2, Math.log2(Math.min((viewState.width - 2 * padding) / width, (viewState.height - 2 * padding) / height)) - viewState.zoom);

    const overview_padding = 6;
    const mapview = {top: (viewState.target[1]) * overview_height / height - overview_height * scale / 2,
                        left: (viewState.target[0]) * overview_width / width - overview_width * scale / 2,
                        width: overview_width * scale - overview_padding,
                        height: overview_height * scale - overview_padding
                        };
    if(mapview.top < 0){
      mapview.height += mapview.top;
      mapview.top = 0;
      }
    mapview.height = Math.min(overview_height - overview_padding - mapview.top, mapview.height);
    if(mapview.left < 0){
      mapview.width += mapview.left;
      mapview.left = 0;
      }
    mapview.width = Math.min(overview_width - overview_padding - mapview.left, mapview.width);

    if(mapview.top < overview_height - overview_padding && mapview.left < overview_width - overview_padding)
      div_map_props.push({position: "absolute", top: mapview.top,left: mapview.left, width: mapview.width, height: mapview.height, border: "3px solid red"});

    views.push(new OrthographicView({ id: 'overview', controller: false, width: 2 * overview_width, height: 2 * overview_height, x: viewState.width - 2 * overview_width - 20, y: 20 - overview_height,
      zoom: Math.log2(overview_width / width)}))

    moveOnOverview = (event) => {
      const clickX = event.clientX - viewState.width + 20 + overview_width;
      const clickY = event.clientY - 20;
      const clickScale = [width / overview_width, height / overview_height]

      setViewState({...viewState, target: [clickScale[0] * clickX , clickScale[1] * clickY]})
      };
    }

  if (isLoading) {
    return (
      <div>
        <LinearProgress thickness={1} />
      </div>
    );
  } else if (!Array.isArray(sourceErrors) && sourceErrors) {
    return (
      <div className="alert alert-danger" role="alert">
        {sourceErrors.message}
      </div>
    );
  }
  return (
    <div>
      <Controller
        sourceData={sourceData}
        layerStates={layerStates}
        isLabel={isLabel}
        resetViewState={resetViewState}
        toggleVisibility={toggleVisibility}
        setLayerOpacity={setLayerOpacity}
        setLayerSelections={setLayerSelections}
        toggleChannelVisibility={toggleChannelVisibility}
        setChannelContrast={setChannelContrast}
        copyLink={copyLink}
        toggleOverview={toggleOverview}
        overviewOn={overviewOn}
      />

      <DeckGL
        ref={deckRef}
        layers={deckLayers}
        viewState={{ortho: viewState,overview: {}}}
        layerFilter={layerFilter}
        onViewStateChange={(e) => setViewState(e.viewState)}
        views={views}
        getTooltip={getTooltip}
        getCursor={({ isDragging }) => {
          return isDragging ? 'grabbing' : 'crosshair';
        }}
      />
        {
        overviewOn && viewState &&
        <div style={div_map_props[0]} onClick={moveOnOverview}>
          <div style={div_map_props[1]}></div>
        </div>
        }
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
