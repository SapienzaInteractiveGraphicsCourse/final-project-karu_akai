# Inside My System

Interactive 3D portfolio developed for the **Interactive Graphics** course at Sapienza University of Rome.

**Author:** Sara Cristina Basco  
**Academic Year:** 2025–2026

## Live demo

[Open Inside My System on GitHub Pages](https://sapienzainteractivegraphicscourse.github.io/final-project-karu_akai/)

A desktop browser with WebGL and hardware acceleration enabled is recommended.

## About the project

**Inside My System** presents personal information, academic experience and projects through an interactive 3D computer case.

The computer components act as navigation elements: selecting an object moves the camera to the corresponding area and opens a portfolio panel.

The scene also includes **Dummy**, an illustrated character adapted into a hierarchical 3D model and animated at runtime.

## How to explore

1. Pull the lamp chain to turn on the scene.
2. Wait for the camera to move towards the computer case.
3. Rotate, pan or zoom the camera.
4. Select Dummy or one of the computer components.
5. Close the information panel or reset the view to continue exploring.

## Portfolio sections

| Scene element | Content |
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
| Click an interactive component | Open the corresponding portfolio section |
| Left-drag | Rotate the camera |
| Right-drag | Pan the camera |
| Mouse wheel | Zoom |
| Panel arrows | Navigate between panel pages |
| Panel close button | Close the current section |
| **Reset view** | Return to the computer-case overview |

## Technical overview

The application is built with:

- **Three.js** for scene management, rendering, lighting, materials and raycasting;
- **GSAP** for camera transitions;
- **Vite** for development and production builds;
- **Blender** for model preparation, hierarchy organisation and GLB export;
- **HTML and CSS** for the loading screen, guidance messages and portfolio panels.

The scene uses PBR materials with base-colour, normal, roughness and metalness maps. The rendering pipeline includes shadow mapping, SSAO, selective bloom, tone mapping and a custom final post-processing pass.

All animations are implemented at runtime in JavaScript. No animation clips are imported from Blender.

The main animated systems are:

- Dummy pointer tracking and waving animation;
- lamp-chain movement;
- cooling-fan rotation;
- particles moving through the cooling tubes;
- coordinated lighting and power transitions;
- camera transitions between portfolio sections.

## Course requirements

The project includes:

- a complex GLB scene composed of multiple objects;
- a hierarchical character model animated through parent-child transformations;
- different types of lights and textures;
- raycasting-based user interaction;
- programmatic object and camera animations;
- online deployment through GitHub Pages;
- technical documentation and user instructions.

## Running locally

### Requirements

- Node.js
- npm
- A browser with WebGL support

### Installation

```bash
git clone https://github.com/SapienzaInteractiveGraphicsCourse/final-project-karu_akai.git
cd final-project-karu_akai
npm install
```

### Development server

```bash
npm run dev
```

Open the local URL printed by Vite.

### Production build

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Project structure

```text
.
├── .github/workflows/    GitHub Pages deployment
├── public/
│   ├── models/           GLB scene
│   └── textures_optimized/
├── report/               Technical report and supporting images
├── scripts/              Texture optimisation scripts
├── src/
│   ├── animations/       Runtime animation systems
│   ├── content/          Portfolio content
│   ├── Experience/       Scene, renderer, camera and interactions
│   └── Utility/          Materials, textures and debugging utilities
├── index.html
├── package.json
└── vite.config.js
```

## External assets and credits

The final scene was assembled and modified in Blender using both original and external components.

### 3D models

- **Table** by **yryabchenko** on Sketchfab  
  [Original model](https://sketchfab.com/3d-models/table-1132fa2850a24917892733566bd68e74) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

- **Gaming Computer** by **Marcseus** on Sketchfab  
  [Original model](https://sketchfab.com/3d-models/gaming-computer-7cf383ddfe9047f89435b4fc2a6e1053) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

The computer model was used as a starting point and was substantially modified in its hierarchy, materials, scale, internal layout and interactive elements.

Additional external Sketchfab assets were used for the lamp, its chain and two plant models. Their original listing metadata was not preserved in the retained local files, so unsupported author or licence information is not assigned.

### Textures

The main PBR texture sets were obtained from [ambientCG](https://ambientcg.com/) and are distributed under the [CC0 1.0 licence](https://creativecommons.org/publicdomain/zero/1.0/):

- [Marble 021](https://ambientcg.com/view?id=Marble021)
- [Metal 033](https://ambientcg.com/view?id=Metal033)
- [Plastic 004](https://ambientcg.com/view?id=Plastic004)
- [Plastic 013 A](https://ambientcg.com/view?id=Plastic013A)
- [Metal 043 A](https://ambientcg.com/view?id=Metal043A)
- [Metal 045 A](https://ambientcg.com/view?id=Metal045A)

Contact icons use SVG paths from [Simple Icons](https://simpleicons.org/).

## Documentation

The complete technical report and user guide are available in the [`report`](report/) directory:

- [Technical report](report/report.pdf)
- [LaTeX source](report/report.tex)

## Author

**Sara Cristina Basco**

Final project for the **Interactive Graphics** course  
Department of Computer, Control and Management Engineering  
Sapienza University of Rome
