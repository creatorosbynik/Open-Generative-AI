# Payoff Studio

Our fork of [Open Generative AI](https://github.com/Anil-matcha/Open-Generative-AI), set up for Payoff's production work.

**The rule:** local first for previz, storyboards and hook tests, because it costs nothing and nothing leaves the PC. Use cloud (MuAPI) only for hero renders on flagship models.

## Cloud / Local switch (desktop app)

The desktop app has one switch in the top bar: **☁ Cloud | ⚡ Local**. Switching reloads the app, so the two never mix.

| | ☁ Cloud mode (blue strip) | ⚡ Local mode (green strip) |
|---|---|---|
| Models | MuAPI only (Seedance, Veo, Kling, Nano Banana…) | On-device only: Z-Image, SDXL, Realistic Vision, Flux Dev, Qwen Image, Wan 2.1/2.2, LTX-2, Hunyuan |
| Studios | Image, Video, Lip Sync, Cinema, Workflows, Agents, MCP | Image, Video |
| Internet | Yes, needs your MuAPI key | **Blocked for the app window.** Prompts, uploads and outputs never leave the PC. Only model downloads (Settings → Local Models) use the network. |
| Cost | MuAPI credits | ₹0 per generation |

The web app (`Start-Payoff-Web.bat`) is always Cloud.

## Two apps, one repo

| | Web app | Desktop app |
|---|---|---|
| Start with | `payoff\Start-Payoff-Web.bat` | `payoff\Build-Desktop-App.bat` (once), then the installed app |
| Studios | 14 (Image, Video, Cinema, Lip Sync, Audio, Clipping, Marketing, AI Influencer, Recast, Vibe Motion, Workflows, Agents, Design Agent, Apps) | 7 (Image, Video, Cinema, Lip Sync, Workflow, Agent, MCP) |
| Models | Cloud only, using your MuAPI key | Cloud **plus local GPU** (sd.cpp + Wan2GP) |
| Use it for | Flagship finals: Seedance, Veo, Kling, Nano Banana Pro | Previz, animatics, hook variants, NDA work |

## First-time setup (Windows, RTX 5080)

1. Install **Node.js 22 LTS** and **Git for Windows**.
2. Clone our fork in GitHub Desktop: File → Clone repository → `creatorosbynik/Open-Generative-AI`. Use `C:\Payoff\Studio` as the local path.
3. Work on the `payoff-studio` branch: Branch → New branch → `payoff-studio`.
4. Double-click `payoff\Start-Payoff-Web.bat`. The first run takes about 5–10 minutes, then it opens http://127.0.0.1:3000.
5. Paste your MuAPI key from muapi.ai → Access Keys. The key is stored in this browser only.

### Local video (Wan2GP)

Follow the Build Day rule: hold this step until the first paid client comes in. Also follow the GPU rule: Strata runs at night and Wan2GP runs during the day, never both at once.


1. Clone https://github.com/deepbeepmeep/Wan2GP to a fast drive, for example `H:\AI\Wan2GP`.
2. Run `scripts\install.bat` and choose **Auto Install**. It picks the right stack for RTX 50-series (PyTorch 2.10 with CUDA 13.0, plus Triton and SageAttention).
3. In the desktop app, go to Settings → Local Models → Wan2GP.
   - Set the folder.
   - Set Python to the env's `python.exe`. The default `venv\Scripts\python.exe` only works if the installer created a venv.
   - Click Save, then Check.
4. To keep model weights off C:, set `OPEN_GENERATIVE_AI_LOCAL_AI_DIR=H:\AI\local-ai` as a Windows environment variable before you launch the app.

Starting models for 16 GB VRAM:

- **Wan 2.1 1.3B** for fast previz.
- **LTX-2 Distilled** for 720p animatics in 8 steps.
- **Wan 2.2 14B** for quality. It's slower and relies on Wan2GP's RAM offloading, which your 64 GB covers.
- **Flux Dev** and **Qwen Image** for stills.

## Money rules

- MuAPI is prepaid and credits don't expire. **The wallet is the spend cap.** Top up small, for example $20 at a time.
- Before a batch of flagship video, check the price on the model's page. Flagship clips cost far more than fast or lite variants.
- Before cutting Higgsfield, compare cost per *usable* shot between Higgsfield and Payoff Studio for 2 weeks.

## Brand-safety and client rules

- The Spicy and no-filter routes are kept in this build by choice. **Never use them for client work or anything carrying a client brand.**
- Confidential client assets (unreleased products, founder faces) go **local only**. Anything sent to cloud models is uploaded to MuAPI's storage.
- Before using any cloud output commercially, check MuAPI's terms for that model.

## What we changed vs upstream

See the change log on the Notion page **PAYOFF → Payoff Studio (Open Generative AI)**. In short:

- Updated dependencies: Next 15.5.28, axios 1.20, plus overrides. `npm audit` now reports 0 vulnerabilities, down from 10.
- Web server and Docker are bound to 127.0.0.1, so other devices on the network can't reach them.
- The local engine download (sd.cpp) is SHA-256 verified against GitHub's published digest before anything is extracted or run.
- Added Windows launchers: `Start-Payoff-Web.bat`, `Build-Desktop-App.bat` and `Update-From-Upstream.bat`.
