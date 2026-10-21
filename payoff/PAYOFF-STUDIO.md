# Payoff Studio

Our fork of [Open Generative AI](https://github.com/Anil-matcha/Open-Generative-AI), rebuilt as Payoff's brand-safe production tool.

**Branches:** `payoff-client` is the clean client build (this guide). `payoff-studio` is the earlier personal build.

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

## First-time setup (Windows, RTX 5060 Ti 16 GB)

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

## Model policy (client build)

`packages/studio/src/payoffPolicy.js` decides every model's status. Policy version: 21 Oct 2026.

| Status | What it means | Today |
|---|---|---|
| Blocked | Removed from the app | 42 Spicy routes, Grok "spicy" mode, 3 Midjourney routes (no official API; its terms ban automated access), local FLUX.1 [dev] (non-commercial weights) |
| Cleared for finals | Terms reviewed; usable in client deliverables | Google (Veo, Imagen, Nano Banana, Gemini, Lyria) and OpenAI (GPT Image, Sora) via MuAPI; local Z-Image, Wan 2.1/2.2, Qwen-Image (Apache-2.0), LTX-2/2.5 (free under USD 10M revenue), SDXL base |
| Previz only | Terms not reviewed yet. Name ends in "· previz only" | Everything else |

To clear a new model: read its maker's terms, add a rule with its licence and basis, bump `POLICY_VERSION`, and log it on the Notion page.

## Client projects and provenance (desktop app)

1. Click the project pill in the top bar and pick **Client** and **Project**. Default folder: `H:\Payoff\Clients`.
2. Every finished image, video, cinema shot or lip-sync is saved to `<Client>\<Project>\ai-assets\`.
3. Each file gets a `.provenance.json` next to it: model, maker, licence, cleared or previz, prompt, seed, reference images, whether data left the PC, SHA-256 and the "Made with AI" disclosure. `_provenance.jsonl` in the same folder is the whole project's log, ready for the delivery sheet.
4. An amber pill means no project is set, so outputs are not being filed.

## Client rules

- Only assets whose record says `"clientDeliverable": true` go into client deliverables. Previz assets stay internal.
- Confidential client assets (unreleased products, faces) go **local only**. MuAPI's terms have no confidentiality clause.
- Every AI-assisted asset that reaches the public carries the disclosure label.

## What we changed vs upstream

See the change log on the Notion page **PAYOFF → Payoff Studio (Open Generative AI)**. In short:

- Updated dependencies: Next 15.5.28, axios 1.20, plus overrides. `npm audit` now reports 0 vulnerabilities, down from 10.
- Web server and Docker are bound to 127.0.0.1, so other devices on the network can't reach them.
- The local engine download (sd.cpp) is SHA-256 verified against GitHub's published digest before anything is extracted or run.
- Added Windows launchers: `Start-Payoff-Web.bat`, `Build-Desktop-App.bat` and `Update-From-Upstream.bat`.
- Cloud / Local mode switch.
- Client build: renamed Payoff Studio (Payoff icon, logo and cream accent), model policy, client projects with provenance records. The app keeps its old settings folder, so the MuAPI key, history and Wan2GP setup carry over. The new installer installs **Payoff Studio** alongside the old "Open Generative AI" app; uninstall the old one once the new one works.
