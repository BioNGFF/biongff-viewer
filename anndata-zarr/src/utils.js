import _ from 'lodash';
import { FetchStore, open, get } from 'zarrita';

import { COLORSCALES } from './constants/colorscales';

export const fetchDataFromZarr = async (url, path, s) => {
  try {
    const store = new FetchStore(url);
    const node = await open(store, { kind: 'group' });

    const dataNode = await open(node.resolve(path));
    let result;
    if (
      dataNode.attrs?.['encoding-type'] === 'array' ||
      dataNode.attrs?.['encoding-type'] === 'string-array'
    ) {
      result = await get(dataNode, s);
    } else if (dataNode.attrs?.['encoding-type'] === 'categorical') {
      const categoriesArr = await open(dataNode.resolve('categories'), {
        kind: 'array',
      });
      const codesArr = await open(dataNode.resolve('codes'), { kind: 'array' });
      const { data: categories } = await get(categoriesArr);
      const { data } = await get(codesArr, s);
      result = { data, categories };
    } else {
      throw new Error('Unsupported encoding-type');
    }

    return result;
  } catch (error) {
    throw error;
  }
};

export const getVarNames = async (url, namesCol = '_index') => {
  try {
    const store = new FetchStore(url);
    const node = await open(store, { kind: 'group' });

    const arr = await open(node.resolve(`var/${namesCol}`, { kind: 'array' }));
    const varNames = (await get(arr)).data;
    return varNames;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getObs = async (url) => {
  try {
    const store = new FetchStore(url);
    const node = await open(store, { kind: 'group' });

    const cols = (await open(node.resolve('obs', { kind: 'group' }))).attrs?.[
      'column-order'
    ];
    const obs = { categorical: [], numerical: [] };
    for (const col of cols) {
      const dataNode = await open(node.resolve(`obs/${col}`));
      const { 'encoding-type': encodingType } = dataNode.attrs || {};
      if (encodingType === 'categorical') {
        const categoriesArr = await open(dataNode.resolve('categories'), {
          kind: 'array',
        });
        const { data: categories } = await get(categoriesArr);
        obs.categorical.push({ name: col, categories });
      } else if (encodingType === 'array') {
        obs.numerical.push({ name: col });
      }
    }
    return obs;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getVarIndex = async (url, varId, namesCol = '_index') => {
  try {
    const store = new FetchStore(url);
    const node = await open(store, { kind: 'group' });

    const arr = await open(node.resolve(`var/${namesCol}`, { kind: 'array' }));
    const varNames = (await get(arr)).data;
    const varIndex = varNames.findIndex((name) => name === varId);
    return varIndex;
  } catch (error) {
    return -1;
  }
};

export const getZarrPath = async (url, matrixProps) => {
  const { feature, obs } = matrixProps;
  if (feature) {
    if (feature.index !== undefined && feature.index !== null) {
      return { url, path: 'X', s: [null, feature.index] };
    } else if (feature.name) {
      return {
        url,
        path: 'X',
        s: [null, await getVarIndex(url, feature.name, feature.namesCol)],
      };
    }
  }

  if (obs) {
    return {
      url,
      path: `obs/${obs.col}`,
      s: null,
    };
  }

  throw new Error('No feature or obs in matrixProps');
};

const parseHexColor = (color) => {
  const r = parseInt(color?.substring(1, 3), 16);
  const g = parseInt(color?.substring(3, 5), 16);
  const b = parseInt(color?.substring(5, 7), 16);

  return [r, g, b];
};

const interpolateColor = (color1, color2, factor) => {
  const [r1, g1, b1] = parseHexColor(color1);
  const [r2, g2, b2] = parseHexColor(color2);

  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  return [r, g, b];
};

const computeColor = (colormap, value) => {
  if (!colormap || isNaN(value)) {
    return [0, 0, 0, 255];
  } else if (value <= 0) {
    return parseHexColor(colormap[0]);
  } else if (value >= 1) {
    return parseHexColor(colormap[colormap.length - 1]);
  }
  const index1 = Math.floor(value * (colormap.length - 1));
  const index2 = Math.ceil(value * (colormap.length - 1));
  const factor = (value * (colormap.length - 1)) % 1;
  return interpolateColor(colormap[index1], colormap[index2], factor);
};

export const getColor = ({ value, colorscale = COLORSCALES.Viridis }) => {
  return [...computeColor(colorscale, value), 255];
};

export const getColors = ({ data, max, min, colorProps, categories }) => {
  return _.map(data, (v, i) => ({
    labelValue: i + 1,
    rgba: getColor({ value: (v - min) / (max - min), ...colorProps }),
    value: categories ? categories[v] : v,
  }));
};
