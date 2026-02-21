# HDR Merge (Electron + Lit 3)

Desktop app to select camera RAW files (including `.cr2`), merge them to OpenEXR (`.exr`), and preview the generated result in-app.

## Current Features

- Select RAW inputs from the current folder, a chosen folder, or manual file selection.
- Merge selected RAW exposures into a single OpenEXR (`.exr`) output.
- Automatically align bracketed RAW frames before HDR merge.
- Choose RAW decode color space (`sRGB`, `Adobe RGB`, `Wide`, `ProPhoto`, `XYZ`, `RAW`).
- Choose base frame strategy (`Middle`, `Darkest`, `Brightest`) for exposure anchoring.
- Compare previous vs current preview in one frame with an A/B split slider.
- Swap A/B sides instantly for visual comparison.

## Known Limitations

- No true motion deghosting is currently applied.
- Alignment is global (MTB) and works best for small camera movement; large subject motion can still create ghosts.
- In-app preview is an LDR preview image for comparison, not full HDR display.
- Final `.exr` appearance can vary by editor due to viewer tone-mapping and color management defaults.

## Recommended Workflow

- Shoot bracketed frames on a tripod with stable framing.
- Keep aperture and ISO fixed; vary only shutter speed.
- Use timer/remote shutter to reduce camera shake.
- Start with 3–5 exposures around mid exposure (for example `-2 / 0 / +2 EV`).
- In the app, test `Color` and `Base` options, then compare results with the A/B split slider.
- Evaluate the final `.exr` in your editor with known color management settings.

## Troubleshooting

- Preview not visible:
  - Run a new merge first (A/B compare needs at least one current result).
  - Check that the generated `*-preview.png` exists next to the `.exr` output.
- Colors look wrong in editor:
  - Try another `Color` option in the app (`sRGB` is a good default).
  - Verify your editor color-management and working-space settings.
- Output looks too bright or too dark:
  - Change `Base` (`Middle`, `Darkest`, `Brightest`) and re-merge.
  - Re-evaluate with the A/B split slider before choosing final output.
- Merge fails to start:
  - Confirm Python dependencies are installed with `python3 -m pip install -r python/requirements.txt`.
  - If needed, set `HDR_MERGE_PYTHON` to your Python executable path.

## Requirements

- Node.js 20+
- Python 3.10+

## Install

```bash
npm install
python3 -m pip install -r python/requirements.txt
```

## Run (development)

```bash
npm run dev
```

Use **Select Folder** or **Select Files** in the app to choose RAW inputs.

If your system Python executable is not `python3`, set:

```bash
export HDR_MERGE_PYTHON=/absolute/path/to/python
```

## Build

```bash
npm run build
```
