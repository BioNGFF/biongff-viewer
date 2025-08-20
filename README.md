# BioNGFF Viewer

Monorepo while testing around

## Demo

The viewer is built from the `main` branch and deployed with GitHub pages.
Images are specified in the URL with the `source` parameter: e.g.

https://biongff.github.io/biongff-viewer/?source=https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0101A/13457537.zarr

## Development

Clone repo and submodules

```sh
git clone git@github.com:BioNGFF/biongff-viewer.git
cd biongff-viewer
git submodule init
git submodule update
```

Install dependencies and run development server

```sh
pnpm i
pnpm run dev
```

Pass the resource to load through the URL source parameter
e.g. 
```
http://localhost:5173?source=https://haniffa.cog.sanger.ac.uk/breast-cancer/xenium/0.0.1/morphology_mip.zarr
```

or visualise a standalone label image
```
http://localhost:5173/?source=https://hindlimb.cog.sanger.ac.uk/datasets/integrated-test/0.0.1/rotated/hindlimb-iss-rotated_90-label.zarr&isLabel=1
```
