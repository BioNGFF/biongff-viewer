# BioNGFF Viewer — archived

> **This repository has moved to [BioNGFF/vizarr](https://github.com/BioNGFF/vizarr).**
> Nothing here is maintained. The demo at `biongff.github.io/biongff-viewer/` now
> forwards to the new viewer, carrying your `source` parameter with it.

**[Open the viewer →](https://biongff.github.io/vizarr/)** ·
**[Repository →](https://github.com/BioNGFF/vizarr)** ·
**[Report a problem →](https://github.com/BioNGFF/vizarr/issues)**

## What this was

A prototype web viewer for bioimaging data written against the
[NGFF specifications](https://ngff.openmicroscopy.org/latest/), built on top of
[Vizarr](https://github.com/hms-dbmi/vizarr) as a git submodule.

It did its job. Working this way showed us where the prototype's limits were: the viewer
we wanted needed changes inside Vizarr rather than around it, and a submodule is an
awkward place to make them. So the work moved to a fork — [BioNGFF/vizarr][new] — where
the viewer, the tables plugin and the ROI plugin are packages in one workspace and can
change together.

[new]: https://github.com/BioNGFF/vizarr

## What moved, and where it went

Everything this repository did, the new one does. The last contributions here were
carried across rather than abandoned:

| here | there |
| --- | --- |
| [#46](https://github.com/BioNGFF/biongff-viewer/pull/46) picture-in-picture overview | [BioNGFF/vizarr#173](https://github.com/BioNGFF/vizarr/pull/173) |
| [#46](https://github.com/BioNGFF/biongff-viewer/pull/46) scale bar units | [BioNGFF/vizarr#177](https://github.com/BioNGFF/vizarr/pull/177) |
| [#44](https://github.com/BioNGFF/biongff-viewer/pull/44) skip obs columns that error | [BioNGFF/vizarr#179](https://github.com/BioNGFF/vizarr/pull/179) |

Viewing state in the URL, the copy-link button and the collapsible controls from
[#46](https://github.com/BioNGFF/biongff-viewer/pull/46) were already in the new viewer
by other routes.

## Your old links

The demo forwards, and the `source` parameter is spelled the same way, so a shared link
still opens the image it always did:

```
https://biongff.github.io/biongff-viewer/?source=…   →   https://biongff.github.io/vizarr/?source=…
```

One parameter changed name. A standalone label image was `&isLabel=1` here; in the new
viewer a label is given with `&label=` beside the image it belongs to. Those links need
editing by hand.

## The history

The code is still here and still readable — archiving freezes a repository, it does not
hide it. Issues and pull requests stay where they are, and the branches are untouched.
New issues belong on [BioNGFF/vizarr](https://github.com/BioNGFF/vizarr/issues).

## Thanks

To everyone who filed, fixed and reviewed here. The viewer you are being sent to is
built out of that work.
