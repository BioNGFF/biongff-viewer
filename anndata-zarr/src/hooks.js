import { useCallback, useEffect, useMemo, useState } from 'react';

import { useQueries, useQuery } from '@tanstack/react-query';
import _ from 'lodash';

import { useFeatureSelect } from './components/FeatureSelect';
import { useObsSelect } from './components/ObsSelect';
import { COLORSCALES } from './constants/colorscales';
import {
  fetchDataFromZarr,
  getZarrPath,
  getColors,
  getVarNames,
  getObs,
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

export const useAnndataColors = (adata = { url: null }, opts = {}) => {
  const {
    data = null,
    isLoading = false,
    serverError = null,
  } = useQuery({
    queryKey: ['anndataColor', adata.url, adata.matrixProps, adata.colorProps],
    queryFn: () =>
      getAnndataColors(adata.url, adata.matrixProps, adata.colorProps),
    ...opts,
  });

  return { data, isLoading, serverError };
};

export const useAnndatasColors = (adatas = [], opts = {}) => {
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
    ...opts,
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

export const useAnndataObs = (adata = { url: null }) => {
  const {
    data = null,
    isLoading = false,
    serverError = null,
  } = useQuery({
    queryKey: ['anndataObs', adata.url],
    queryFn: () => getObs(adata.url),
  });

  return { data, isLoading, serverError };
};

export const useAnndata = (adata = { url: null }) => {
  const [colorEncoding, setColorEncoding] = useState(null);
  const [colors, setColors] = useState(null);

  const { featureData, featureSelect } = useFeatureSelect({
    adata,
    onSelect: () => setColorEncoding('feature'),
  });
  const { obsData, obsSelect } = useObsSelect({
    adata,
    onSelect: () => setColorEncoding('obs'),
  });

  const colorData = useMemo(() => {
    if (colorEncoding === 'feature') {
      return featureData;
    } else if (colorEncoding === 'obs') {
      return obsData;
    }
    return null;
  }, [colorEncoding, featureData, obsData]);

  useEffect(() => {
    if (colorData?.serverError) {
      setColors(null);
      return;
    }
    if (!colorData?.isLoading && colorData?.data) {
      setColors(colorData.data.colors);
    }
  }, [colorData?.data, colorData?.isLoading, colorData?.serverError]);

  return { colors, featureSelect, obsSelect };
};
