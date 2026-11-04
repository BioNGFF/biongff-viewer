# BioNGFF Viewer Prototype [archived]

> **This repository has moved to
> [BioNGFF/vizarr](https://github.com/BioNGFF/vizarr).**
> Nothing here is maintained.

**[Open the viewer](https://biongff.github.io/vizarr/)** ·
**[Repository](https://github.com/BioNGFF/vizarr)** ·
**[Report a problem](https://github.com/BioNGFF/vizarr/issues)**

## What this was

A prototype web viewer for bioimaging data written against the
[NGFF specifications](https://ngff.openmicroscopy.org/latest/), built on top of
[Vizarr](https://github.com/hms-dbmi/vizarr) as a git submodule.

It did its job, but the work has now moved to a fork at
[BioNGFF/vizarr](https://github.com/BioNGFF/vizarr), where the viewer, the tables
plugin and the ROI plugin are packages in one workspace and can change together.

## What moved, and where it went

Everything this repository did, the new one does. The last contributions here were
carried across rather than abandoned:

| here                                         | there                            |
| -------------------------------------------- | -------------------------------- |
| [#46][viewer-46] picture-in-picture overview | [BioNGFF/vizarr#173][vizarr-173] |
| [#46][viewer-46] scale bar units             | [BioNGFF/vizarr#177][vizarr-177] |
| [#44][viewer-44] skip obs columns that error | [BioNGFF/vizarr#179][vizarr-179] |

[viewer-46]: https://github.com/BioNGFF/biongff-viewer/pull/46
[viewer-44]: https://github.com/BioNGFF/biongff-viewer/pull/44
[vizarr-173]: https://github.com/BioNGFF/vizarr/pull/173
[vizarr-177]: https://github.com/BioNGFF/vizarr/pull/177
[vizarr-179]: https://github.com/BioNGFF/vizarr/pull/179

## The history

The code is still here and still readable, but archiving will freeze this
repository. Any issues and pull requests stay where they are, and the branches
are untouched. New issues belong on
[BioNGFF/vizarr](https://github.com/BioNGFF/vizarr/issues).

## Thanks

To everyone who filed, fixed and reviewed here. The viewer you are being sent to is
built out of that work.
