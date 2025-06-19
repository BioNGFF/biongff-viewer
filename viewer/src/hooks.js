import { useEffect, useState } from 'react';

import { createSourceData } from '@hms-dbmi/vizarr/src/io';
import { FetchStore, open } from 'zarrita';

import { isBioformats2Raw } from './utils';

export const useSourceData = (config) => {
  const [sourceData, setSourceData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const base = config.source;
        const metadataUrl = `${base}${base.slice(-1) === '/' ? '' : '/'}.zmetadata`;

        let metadata = null;
        try {
          const response = await fetch(metadataUrl);
          if (
            response.ok &&
            response.headers.get('content-type')?.includes('application/json')
          ) {
            metadata = await response.json().metadata;
          }
        } catch (e) {
          console.warn(
            'No .zmetadata file found, falling back to opening store directly',
          );
        }

        const store = new FetchStore(base);
        const node = await open(store, { kind: 'group' });

        if (isBioformats2Raw(node)) {
          // https://ngff.openmicroscopy.org/0.4/#bf2raw-details
          if (node.attrs['bioformats2raw.layout'] !== 3) {
            setError(new Error('Unsupported bioformats2raw layout'));
            return;
          }
          let series;
          if (metadata) {
            if ('OME/.zattrs' in metadata) {
              const ome = await open(node.resolve('OME'), { kind: 'group' });
              series = ome.attrs.series;
            } else {
              const multiscaleKeys = Object.keys(metadata).filter(
                (key) =>
                  key.endsWith('/.zattrs') && 'multiscales' in metadata[key],
              );
              series = multiscaleKeys.map((key) => key.split('/')[0]);
            }
          } else {
            const ome = await open(node.resolve('OME'), { kind: 'group' });
            series = ome.attrs?.series || ['0'];
          }

          const seriesUrl = `${base}${base.slice(-1) === '/' ? '' : '/'}${series?.[0] || ''}`;
          const data = await createSourceData({
            ...config,
            source: seriesUrl,
          });
          setSourceData(data);
          return;
        } else {
          const data = await createSourceData(config);
          setSourceData(data);
          return;
        }
      } catch (err) {
        setError(err);
      }
    };

    if (!config?.source) {
      setSourceData(null);
      setError(new Error('No source provided'));
    } else {
      fetchData();
    }
  }, [config]);

  return { sourceData, error };
};
