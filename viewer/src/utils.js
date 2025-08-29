import { open, NodeNotFoundError } from 'zarrita';
import * as utils from '@hms-dbmi/vizarr/src/utils';
import { ZarrPixelSource } from '@hms-dbmi/vizarr/src/ZarrPixelSource';

export async function getZarrJson(location, path = '') {
  const jsonUrl = `${location.replace(/\/?$/, '/')}${path ? path.replace(/\/?$/, '/') : ''}zarr.json`;
  let zarrJson;
  try {
    zarrJson = await (await fetch(jsonUrl)).json();
  } catch {}
  return zarrJson;
}

export async function getZarrMetadata(location) {
  const metadataUrl = `${location.replace(/\/?$/, '/')}.zmetadata`;
  let metadata;
  try {
    metadata = (await (await fetch(metadataUrl)).json()).metadata;
  } catch {}
  return metadata;
}

export async function findSeries(location, node, zarrVersion) {
  // separate "multiscales" images MUST be stored in consecutively numbered groups starting from 0
  let s = 0;
  let series = [];
  while (true) {
    let seriesNode;
    try {
      seriesNode = await open(node.resolve(`${s}`), {
        kind: 'group',
      });
    } catch {
      break;
    }
    let attrs;
    if (zarrVersion === 3) {
      try {
        attrs = (await getZarrJson(location, s.toString()))?.attributes?.ome;
      } catch {}
    } else {
      attrs = seriesNode.attrs;
    }
    if (attrs?.['multiscales']) {
      series.push(`${s}`);
    } else break;
    s++;
  }
  return series;
}

// Following ome-ngff-validator approach https://github.com/ome/ome-ngff-validator/blob/d29a48d930b68c21f2ee931ef0f681f695e70d1a/src/utils.js#L110
export async function getXmlDom(location) {
  const url = `${location.replace(/\/?$/, '/')}OME/METADATA.ome.xml`;
  let xmlString;
  try {
    xmlString = await (await fetch(url)).text();
  } catch {}
  if (!xmlString) {
    return null;
  }
  const parser = new DOMParser();
  const dom = parser.parseFromString(xmlString, 'text/xml');
  return dom;
}

// From ome-ngff-validator https://github.com/ome/ome-ngff-validator/blob/d29a48d930b68c21f2ee931ef0f681f695e70d1a/src/Bioformats2rawLayout/index.svelte#L70
export function parseXml(dom) {
  const root = dom.documentElement;

  let rsp = { images: [] };
  let index = 0;
  for (const child of root.children) {
    if (child.tagName === 'Image') {
      const dimensionOrder = child
        .getElementsByTagName('Pixels')?.[0]
        ?.getAttribute('DimensionOrder');
      rsp.images.push({
        name: child.getAttribute('Name'),
        id: child.getAttribute('ID'),
        path: '' + index++,
        ...(dimensionOrder && { dimensionOrder }),
      });
    }
    // error handling - parsererror gives html doc
    if (child.tagName === 'body') {
      if (child.firstElementChild.tagName === 'parsererror') {
        rsp.errors = [...child.firstElementChild.children].map(
          (el) => el.innerHTML,
        );
      }
    }
  }
  return rsp;
}

// From deck.gl geo-layers tileset-2d utils
export function transformBox(bbox, modelMatrix) {
  const transformedCoords = [
    // top-left
    modelMatrix.transformAsPoint([bbox[0], bbox[1]]),
    // top-right
    modelMatrix.transformAsPoint([bbox[2], bbox[1]]),
    // bottom-left
    modelMatrix.transformAsPoint([bbox[0], bbox[3]]),
    // bottom-right
    modelMatrix.transformAsPoint([bbox[2], bbox[3]]),
  ];
  const transformedBox = [
    // Minimum x coord
    Math.min(...transformedCoords.map((i) => i[0])),
    // Minimum y coord
    Math.min(...transformedCoords.map((i) => i[1])),
    // Max x coord
    Math.max(...transformedCoords.map((i) => i[0])),
    // Max y coord
    Math.max(...transformedCoords.map((i) => i[1])),
  ];
  return transformedBox;
}

// From vizarr utils
// Workaround for verson 0.5
export async function resolveOmeLabelsFromMultiscales(grp) {
  return open(grp.resolve("labels"), { kind: "group" })
    .then(({ attrs }) => (utils.resolveAttrs(attrs).labels ?? [])) // use resolveAttrs to use ome if present
    .catch((e) => {
      utils.rethrowUnless(e, NodeNotFoundError);
      return [];
    });
}

export async function loadOmeImageLabel(root, name) {
  const grp = await open(root.resolve(name), { kind: "group" });
  const attrs = utils.resolveAttrs(grp.attrs);
  utils.assert(utils.isOmeImageLabel(attrs), "No 'image-label' metadata.");
  const data = await utils.loadMultiscales(grp, attrs.multiscales);
  const baseResolution = data.at(0);
  utils.assert(baseResolution, "No base resolution found for multiscale labels.");
  const tileSize = utils.guessTileSize(baseResolution);
  const axes = utils.getNgffAxes(attrs.multiscales);
  const labels = utils.getNgffAxisLabels(axes);
  const colors = (attrs["image-label"].colors ?? []).map((d) => ({ labelValue: d["label-value"], rgba: d.rgba }));
  return {
    name,
    modelMatrix: utils.coordinateTransformationsToMatrix(attrs.multiscales),
    loader: data.map((arr) => new ZarrPixelSource(arr, { labels, tileSize })),
    colors: colors.length > 0 ? colors : undefined,
  };
}