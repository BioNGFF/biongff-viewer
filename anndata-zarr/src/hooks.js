import { useCallback } from 'react';

import { useQueries, useQuery } from '@tanstack/react-query';
import _ from 'lodash';

import { COLORSCALES } from './constants/colorscales';
import {
  fetchDataFromZarr,
  getZarrPath,
  getColors,
  getVarNames,
} from './utils';

const getAnndataColors = async (url, matrixProps, colorProps) => {
  let zarrData;
  try {
    const zarrPath = await getZarrPath(url, matrixProps);
    zarrData = await fetchDataFromZarr(zarrPath.url, zarrPath.path, zarrPath.s);
  } catch (error) {
    console.error(error);
    return null;
  }
  if (!zarrData) return null;

  const { categories } = zarrData;

  const max = categories
    ? categories.length - 1
    : colorProps?.max || _.max(zarrData.data);
  const min = categories ? 0 : colorProps?.min || _.min(zarrData.data);
  const colorscale = categories ? COLORSCALES.Accent : colorProps?.colorscale;

  return {
    colors: getColors({
      data: _.map(zarrData.data, (v) => (v - min) / (max - min)),
      colorProps: { ...colorProps, colorscale },
    }),
    max,
    min,
    ...(categories ? { categories } : {}),
  };
};

export const useAnndataColors = (adatas = []) => {
  const combine = useCallback((results) => {
    return {
      data: results.map((result) => result.data),
      isLoading: results.some((result) => result.isLoading),
      serverError: results.find((result) => result.error),
    };
  }, []);

  const {
    data = null,
    isLoading = false,
    serverError = null,
  } = useQueries({
    queries: adatas.map(({ url, matrixProps, colorProps }) => ({
      queryKey: ['anndataColor', url, matrixProps, colorProps],
      queryFn: () => getAnndataColors(url, matrixProps, colorProps),
    })),
    combine,
  });

  return { data, isLoading, serverError };
};

export const useAnndataFeatures = (adata = { url: null, namesCol: null }) => {
  const {
    data = null,
    isLoading = false,
    serverError = null,
  } = useQuery({
    queryKey: ['anndataFeatures', adata.url, adata.namesCol],
    queryFn: () => getVarNames(adata.url, adata.namesCol),
  });

  return { data, isLoading, serverError };
};
