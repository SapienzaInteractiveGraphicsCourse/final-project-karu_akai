# Inside My System

*An interactive 3D portfolio where a computer case becomes a small personal world.*

Author: **Sara Cristina Basco** · Interactive Graphics · Sapienza University of Rome · July 2026

## ▶ Live demo

**[Open Inside My System on GitHub Pages](https://sapienzainteractivegraphicscourse.github.io/final-project-karu_akai/)**

The application runs entirely in the browser. For the intended visual experience, a desktop browser with WebGL and hardware acceleration enabled is recommended.

## The project

**Inside My System** is an explorable 3D portfolio developed for the Interactive Graphics course at Sapienza University of Rome.

Instead of presenting academic experiences, projects and interests through a conventional website, the portfolio places them inside a custom computer case. Its internal components become navigation elements, transforming the hardware into a visual representation of a personal system.

The project combines two central parts of my background: **engineering and illustration**. The computer case represents the technical structure of the portfolio, while **Dummy**, a recurring character from my illustrations, introduces its personal and creative dimension.

The title refers both to the physical computer system shown in the scene and to the system of experiences, skills and interests contained within it.

## The experience

The application initially opens in darkness, with the camera directed towards a desk lamp.

1. Pull the lamp chain to wake up the system.
2. Wait for the camera to move towards the computer case.
3. Explore the scene by rotating and zooming the camera.
4. Click Dummy or one of the computer components.
5. Read the corresponding portfolio section.
6. Close the panel or reset the view to continue exploring.

Guidance messages introduce the main interactions and reappear after a period of inactivity when the user may need assistance.

## Portfolio map

| Scene element | Portfolio content |
| --- | --- |
| **Dummy** | Contact information and project introduction |
| **CPU** | About me |
| **GPU** | Projects |
| **RAM** | Academic background |
| **Cooling fans** | Work experience |
| **Cables and cooling tubes** | Hobbies and interests |

## Controls

| Input | Action |
| --- | --- |
| Click the lamp chain | Turn the system on or off |
| Click Dummy or a computer component | Move to the corresponding viewpoint and open its portfolio section |
| Drag | Rotate the camera around the scene |
| Right-drag | Pan the camera |
| Mouse wheel | Zoom in or out |
| Panel arrows | Navigate between pages or subsections |
| Panel close button | Close the current section and return to the main view |
| **Reset view** | Return the camera to the computer-case overview |

During camera, lighting and power transitions, incompatible interactions are temporarily locked. When a portfolio panel is open, other scene sections cannot be selected until the current panel is closed.

## Features at a glance

- Real-time 3D rendering with Three.js and WebGL.
- A complete desk environment exported as a binary glTF model.
- A custom computer case whose hardware components act as portfolio navigation targets.
- Dedicated invisible raycasting proxies separated from the visible model geometry.
- Smooth camera transitions between predefined viewpoints using GSAP.
- Constrained `OrbitControls` navigation for rotation, panning and zooming.
- A global interaction-state manager for power, camera and interface transitions.
- Contextual guidance messages and inactivity reminders.
- Structured portfolio panels for academic experiences, projects and work history.
- Runtime material assignment based on GLB object names and hierarchy.
- PBR materials using colour, normal, roughness and metalness maps.
- Controlled transparency for glass surfaces and cooling tubes.
- Warm lamp lighting, case LED illumination and local accent lights.
- Shadow mapping and a dedicated contact shadow beneath Dummy.
- ACES Filmic tone mapping, SSAO, selective bloom and a custom cinematic finishing pass.
- Responsive loading and WebGL fallback states.

## Programmatic animations

All final animations are implemented at runtime in JavaScript. No animation clips are imported from Blender.

### Dummy

Dummy is constructed from separate rigid components connected through a runtime parent-child hierarchy.

Its animated structure includes:

- body;
- neck;
- head;
- shoulder;
- upper arm;
- elbow;
- forearm;
- wrist;
- hand.

During the idle state, the body, neck and head gradually follow the pointer with different rotation intensities. When Dummy is selected, its articulated right arm performs a short waving animation before returning to the initial pose.

### Lamp chain

The lamp chain acts as the entry point of the experience. Pulling it produces a short downward movement, secondary oscillation and mesh deformation before activating or deactivating the scene.

### Cooling fans

The fan rotors are detected through semantic names stored in the GLB hierarchy. Each fan rotates around its configured local axis with a slightly different speed multiplier.

The rotation speed increases and decreases gradually according to the power state rather than changing instantaneously.

### Cooling-tube flow

Small animated particles move along paths associated with the transparent cooling tubes. Their movement begins when the system is powered on and stops when it is turned off.

### Power transition

The power state coordinates several visual systems:

- lamp intensity;
- environmental illumination;
- case LED materials;
- CPU lighting;
- fan movement;
- cooling-tube particles;
- renderer exposure;
- camera movement.

## Course requirements → implementation

- **Complex model** — the main GLB scene contains the computer case, internal hardware, desk, lamp, chain, plants and Dummy. It preserves semantically meaningful objects instead of being treated as a single static mesh.

- **Hierarchical model** — Dummy is animated through an articulated parent-child structure created at runtime. Rotating a parent joint automatically transforms its descendants, allowing the shoulder, elbow, wrist and hand to produce coordinated movement.

- **Lights** — the scene combines environmental lighting, practical background lights, the desk lamp, local case illumination and fan accents. Several lights react dynamically to the system power state.

- **Textures** — the application uses base-colour, normal, roughness and metalness maps, together with transparent and emissive materials.

- **User interaction** — raycasting controls the lamp chain and portfolio targets. Users can navigate the scene, change viewpoint, open sections, browse structured content and reset the camera.

- **Animations** — Dummy movement, the waving gesture, the lamp chain, fan rotation, tube particles, lighting transitions and camera transitions are all implemented programmatically.

- **Online deployment** — the production build is generated with Vite and deployed through GitHub Pages.

## Rendering pipeline

The renderer uses a configurable post-processing pipeline built with official Three.js addons:

1. Base scene rendering.
2. Screen-space ambient occlusion.
3. Selective rendering of emissive objects.
4. Unreal Bloom on the dedicated bloom layer.
5. Composition of the base and bloom textures.
6. Custom colour grading, contrast and vignette.
7. Final colour-space conversion.

The selective-bloom system prevents the complete scene from glowing and applies the effect only to intended LED and emissive elements.

## Interaction architecture

The application is organised around a central `Experience` instance.

```text
main.js
└── Experience
    ├── Sizes
    ├── Time
    ├── Camera
    ├── Renderer
    ├── InteractionStateManager
    ├── GuidanceOverlay
    ├── RaycasterController
    │   └── SectionPanel
    └── World
        ├── Environment
        └── PortfolioModel
            ├── PowerExperience
            ├── DummyAnimator
            ├── AnimatorChain
            ├── FanAnimator
            ├── TubeFlowAnimator
            ├── ApplyingTexture
            ├── MaterialEnhancements
            └── ExtraLight
```

`Experience` owns the shared scene, camera, renderer and update loop. Each frame, it updates the camera controls, world animations, interaction system and renderer.

`PortfolioModel` loads and configures the GLB scene. Objects beginning with `CLICK_` are registered as invisible interaction targets, while other naming conventions identify animated fan rotors, CPU elements and lighting components.

`RaycasterController` operates on a dedicated Three.js layer so that only intended targets can receive pointer interactions.

## Technology stack

| Technology | Version | Purpose |
| --- | ---: | --- |
| **JavaScript** | ES modules | Application logic, interactions and runtime animations |
| **Three.js** | 0.184.0 | WebGL rendering, scene graph, models, lights, materials and raycasting |
| **GSAP** | 3.15.0 | Camera-position and camera-target interpolation |
| **Simple Icons** | 16.25.0 | Contact-interface SVG icons |
| **Vite** | 8.1.0 | Development server, bundling and production build |
| **HTML and CSS** | — | Loading screen, guidance messages and portfolio panels |
| **Blender** | — | Model preparation, hierarchy organisation, UV mapping and GLB export |
| **Python and Pillow** | — | Texture resizing, conversion and compression |
| **GitHub Pages** | — | Public deployment |

## Running locally

### Requirements

- Node.js
- npm
- A modern browser with WebGL support

### Clone the repository

```bash
git clone https://github.com/SapienzaInteractiveGraphicsCourse/final-project-karu_akai.git
cd final-project-karu_akai
```

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Open the local URL printed by Vite in the terminal.

### Create a production build

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

The Vite configuration automatically applies the repository base path when the application is built through GitHub Actions.

## Repository layout

```text
.
├── .github/
│   └── workflows/
│       └── deploy.yml
├── public/
│   ├── models/
│   │   └── portfolio_case.glb
│   └── textures_optimized/
├── report/
├── scripts/
├── src/
│   ├── main.js
│   ├── style.css
│   ├── animations/
│   │   ├── AnimatorChain.js
│   │   ├── DummyAnimator.js
│   │   ├── FanAnimator.js
│   │   └── TubeFlowAnimator.js
│   ├── content/
│   │   └── portfolioSections.js
│   ├── Experience/
│   │   ├── Camera.js
│   │   ├── Experience.js
│   │   ├── InteractionState.js
│   │   ├── PowerExperience.js
│   │   ├── Renderer.js
│   │   ├── VisualConfig.js
│   │   ├── Controls/
│   │   │   └── RaycasterController.js
│   │   ├── UI/
│   │   │   ├── GuidanceOverlay.js
│   │   │   └── SectionPanel.js
│   │   ├── Utils/
│   │   │   ├── Sizes.js
│   │   │   └── Time.js
│   │   └── World/
│   │       ├── Environment.js
│   │       ├── ExtraLight.js
│   │       ├── PortfolioModel.js
│   │       └── World.js
│   └── Utility/
│       ├── ApplyingTexture.js
│       ├── CozyLedMaterials.js
│       ├── DebugUtils.js
│       └── ModelMaterialSafety.js
├── index.html
├── package.json
└── vite.config.js
```

## Performance and robustness

The original source texture set was too large for practical browser delivery. A dedicated optimisation workflow was therefore created using Node.js, Python and Pillow.

The selected textures were reduced from approximately **505 MiB to 4.7 MiB**, corresponding to a reduction of about **99.1%**.

Additional performance and reliability measures include:

- resolution limits chosen according to the semantic role of each texture;
- compressed JPEG assets where transparency is unnecessary;
- lower-resolution roughness and metalness maps;
- a capped device pixel ratio;
- half-resolution SSAO;
- selective bloom instead of full-scene bloom;
- controlled shadow casting for transparent and decorative meshes;
- on-demand material and texture configuration;
- a lightweight placeholder displayed while the GLB model loads;
- a readable fallback message when a WebGL context cannot be created;
- repository-aware asset paths for GitHub Pages deployment.

## External assets and credits

The final `portfolio_case.glb` scene was assembled and substantially modified in Blender from both original and external components.

### Identified 3D models

- **Table** by **yryabchenko** on Sketchfab  
  [Original model](https://sketchfab.com/3d-models/table-1132fa2850a24917892733566bd68e74) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

- **Gaming Computer** by **Marcseus** on Sketchfab  
  [Original model](https://sketchfab.com/3d-models/gaming-computer-7cf383ddfe9047f89435b4fc2a6e1053) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

The computer model was used only as a starting point. Its hierarchy, materials, scale, internal arrangement, interactive targets and decorative details were substantially reworked for this project.

Additional external Sketchfab assets were used for the lamp, its separate chain and two plant models. These assets were modified, renamed and merged into the final Blender scene. Their original listing metadata was not preserved in the retained local files, so unsupported author or licence information is not assigned here.

### PBR textures

The principal external PBR texture sets were obtained from [ambientCG](https://ambientcg.com/) and are distributed under the [CC0 1.0 licence](https://creativecommons.org/publicdomain/zero/1.0/).

- [Marble 021](https://ambientcg.com/view?id=Marble021)
- [Metal 033](https://ambientcg.com/view?id=Metal033)
- [Plastic 004](https://ambientcg.com/view?id=Plastic004)
- [Plastic 013 A](https://ambientcg.com/view?id=Plastic013A)
- [Metal 043 A](https://ambientcg.com/view?id=Metal043A)
- [Metal 045 A](https://ambientcg.com/view?id=Metal045A)

The environmental background was created specifically for **Inside My System** and optimised for web delivery.

Contact-interface icons use SVG paths from [Simple Icons](https://simpleicons.org/), with a locally stored LinkedIn path where required.

## Documentation

The technical report and its supporting material are available in the [`report`](report/) directory.

The report covers:

- project concept and design process;
- external libraries and assets;
- scene composition and GLB preparation;
- hierarchical modelling;
- animation systems;
- rendering and lighting;
- interaction architecture;
- texture optimisation;
- performance considerations;
- user instructions.

## Author

**Sara Cristina Basco**

Final project for the **Interactive Graphics** course  
Department of Computer, Control and Management Engineering  
Sapienza University of Rome · Academic Year 2025–2026