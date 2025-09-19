import { useEffect, useState } from 'react';

import { createSourceData } from '@hms-dbmi/vizarr/src/io';
import {
  isBioformats2rawlayout,
  guessZarrVersion,
  isOmePlate,
  isMultiscales,
  coordinateTransformationsToMatrix,
} from '@hms-dbmi/vizarr/src/utils';
import { FetchStore, open } from 'zarrita';

import {
  findSeries,
  getNgffAxes,
  getXmlDom,
  getZarrJson,
  getZarrMetadata,
  loadOmeImageLabel,
  parseXml,
  resolveOmeLabelsFromMultiscales,
} from './utils';

const fetchSourceData = async (config) => {
  try {
    const base = config.source;

    const store = new FetchStore(base);
    let zarrVersion = await guessZarrVersion(store);
    let node;
    if (zarrVersion === 3) {
      node = await open.v3(store, { kind: 'group' });
    } else {
      node = await open.v2(store, { kind: 'group' });
    }

    const zarrJson = zarrVersion === 3 ? await getZarrJson(base) : null;
    let ome = zarrJson?.attributes?.ome || node.attrs?.OME || null;

    let sourceData;
    if (
      !isBioformats2rawlayout(ome || node.attrs) ||
      isOmePlate(ome || node.attrs) // if plate is present it takes precedence (https://ngff.openmicroscopy.org/0.4/#bf2raw-attributes)
    ) {
      // use Vizarr's createSourceData with source as is

      if (ome?.version === '0.5') {
        sourceData = await createSourceData(config);
        const labels = await resolveOmeLabelsFromMultiscales(node);
        sourceData.labels = await Promise.all(
          labels.map((name) => loadOmeImageLabel(node.resolve('labels'), name)),
        );
      } else {
        sourceData = await createSourceData(config);
      }
    } else {
      // load bioformats2raw.layout
      // https://ngff.openmicroscopy.org/0.4/#bf2raw

      // get b2f metadata from ome key in metadata or node attributes
      const b2fl =
        ome?.['bioformats2raw.layout'] || node.attrs?.['bioformats2raw.layout'];
      if (b2fl !== 3) {
        throw new Error('Unsupported bioformats2raw layout');
      }

      // Try to load .zmetadata if present
      const metadata = await getZarrMetadata(base);

      // Try to load OME group at root if present and not in v3 zarr metadata
      if (!ome) {
        try {
          ome = await open(node.resolve('OME'), { kind: 'group' });
        } catch {}
      }

      // Try to load OME XML file if present
      const omeXmlDom = await getXmlDom(base);
      let omeXml = omeXmlDom ? parseXml(omeXmlDom) : null;

      let series;
      if (ome?.series) {
        series = ome.series;
      } else if (ome?.attrs?.series) {
        series = ome.attrs.series;
      } else {
        // https://ngff.openmicroscopy.org/0.4/#bf2raw-details
        if (metadata) {
          const multiscaleKeys = Object.keys(metadata).filter(
            (key) => key.endsWith('/.zattrs') && 'multiscales' in metadata[key],
          );
          series = multiscaleKeys.map((key) => key.split('/')[0]);
        } else if (omeXml) {
          series = omeXml.images.map((image) => image.path);
        } else {
          console.warn(
            'No OME group, .zmetadata or xml file. Attempting to find series.',
          );
          series = await findSeries(base, node, zarrVersion);
        }
      }

      const seriesMd = await Promise.all(
        series?.map(async (s, index) => {
          const seriesNode = await open(node.resolve(s), {
            kind: 'group',
          });
          if (!seriesNode.attrs.multiscales?.[0].axes && omeXml) {
            // get axes from xml if not in metadata
            // "The specified dimension order is then reversed when creating Zarr arrays, e.g. XYCZT would become TZCYX in Zarr." (https://github.com/glencoesoftware/bioformats2raw/blob/85ef84db26ce1239dd71ef482b4f38f67e605491/README.md?plain=1#L293)
            // though multiscales metadata MUST have axes (https://ngff.openmicroscopy.org/0.4/#multiscale-md)
            const dimensionOrder = omeXml.images[index].dimensionOrder;
            return dimensionOrder
              ? {
                  channel_axis:
                    dimensionOrder?.length - dimensionOrder?.indexOf('C') - 1,
                }
              : {};
          }
          return {};
        }),
      );

      // @TODO: return all series
      const sIndex = 0;

      const seriesUrl = `${base.replace(/\/?$/, '/')}${series?.[sIndex] || ''}`;
      sourceData = await createSourceData({
        ...config,
        source: seriesUrl,
        ...seriesMd[sIndex],
      });
    }

    // @TODO: implement this in createSourceData
    // Get physical sizes and add them to loader.meta (or as another prop?)
    const attrs = ome || node.attrs;
    if (isMultiscales(attrs)) {
      const axes = getNgffAxes(attrs.multiscales);
      const ct = coordinateTransformationsToMatrix(attrs.multiscales);
      const matrixIndices = {
        x: 0,
        y: 5,
        z: 10,
      };
      const physicalSizes = axes
        .filter((a) => a.type === 'space')
        .reduce((acc, a) => {
          acc[a.name] = { size: ct[matrixIndices[a.name]], unit: a.unit };
          return acc;
        }, {});
      // @TODO: get t size from multiscales.coordinateTransformations if axis is present
      sourceData.loader[0].meta = { physicalSizes };
    }

    return sourceData;
  } catch (err) {
    throw err;
  }
};

export const useSourceData = (configs) => {
  const [sourceData, setSourceData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const results = await Promise.allSettled(
        configs.map((config) => fetchSourceData(config)),
      );

      const data = [];
      const errors = [];

      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          data.push(res.value);
          errors.push(null);
        } else {
          data.push(null);
          errors.push(res.reason);
        }
      });

      setSourceData(data);
      setErrors(errors);
      setIsLoading(false);
    };

    if (!configs.length) {
      setSourceData([]);
      setErrors(new Error('No source provided'));
      setIsLoading(false);
    } else {
      fetchData();
    }
  }, [configs]);

  return { sourceData, errors, isLoading };
};
