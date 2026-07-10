# InsideMySystem

Interactive 3D portfolio built with Three.js for the Interactive Graphics course at Sapienza University of Rome.

InsideMySystem turns a personal portfolio into a small explorable scene: a cozy desk setup with a custom PC case, a desk lamp, animated fans, LED accents, and a wooden mannequin called Dummy. The visitor powers on the scene by interacting with the lamp chain, then explores the portfolio by clicking the internal components of the computer case.

## Live Demo

GitHub Pages link: `TODO`

## Concept

The project uses the inside of a computer case as a visual metaphor for a personal system. Each hardware element corresponds to a portfolio section:

| Scene Object | Portfolio Section |
| --- | --- |
| Dummy | Intro |
| CPU | About me |
| GPU | Projects |
| RAM | Academic |
| Fans | Work experience |
| Cables | Hobby and interests |

The initial experience is intentionally dark. The user is encouraged to click the lamp chain: the desk lamp turns on, the environment lighting increases, the case LEDs become visible, and the fans start spinning.

## Features

- Real-time 3D scene rendered with Three.js and Vite.
- Custom GLB model loaded at runtime with `GLTFLoader`.
- Hierarchical Dummy animation implemented in JavaScript: head, neck, body, shoulder, elbow, wrist, and hand react through parent-child pivots.
- Interactive raycasting layer for clickable scene objects.
- Smooth camera transitions between portfolio sections using GSAP.
- Power-on interaction through lamp/chain click targets.
- Animated fan rotors with gradual acceleration and deceleration.
- Procedural CPU core detail generated in code with a canvas texture for the `SBC` label.
- Material assignment system for imported GLB meshes based on object and material names.
- Color, roughness, normal, and metalness texture support.
- Transparent materials for glass and cooling tubes.
- Selective bloom post-processing for LED elements.
- Loading screen and side panel UI for portfolio content.

## Tech Stack

- JavaScript ES modules
- Three.js
- Vite
- GSAP
- Tween.js dependency available for animation experiments
- Blender for custom model creation and scene asset preparation

## Getting Started

### Requirements

- Node.js
- npm

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Open the local Vite URL shown in the terminal.

### Production Build

```bash
npm run build
```

### Preview Build

```bash
npm run preview
```

## Project Structure

```text
src/
  main.js
  style.css
  Experience/
    Experience.js
    Camera.js
    Renderer.js
    PowerExperience.js
    Controls/
      RaycasterController.js
    Utils/
      Sizes.js
      Time.js
    World/
      Environment.js
      PortfolioModel.js
  animations/
    AnimatorChain.js
    DummyAnimator.js
  utils/
    ApplyingTexture.js
    CozyLedMaterials.js
    ModelMaterialSafety.js
public/
  models/
    portfolio_case.glb
  textures/
```

## Assets

The main scene expects these runtime assets:

- `public/models/portfolio_case.glb`
- `public/textures/background/library-background.png`
- texture folders for dummy, table, case, fans, plastic, and metal materials

Some large assets, Blender source files, texture archives, and generated texture folders may be excluded from Git through `.gitignore`. If the model or textures are missing, the project keeps a placeholder scene visible and logs a warning in the console.

## User Controls

| Action | Result |
| --- | --- |
| Click lamp or chain | Toggle the power state of the scene |
| Click Dummy | Open the Intro panel and trigger Dummy's wave animation |
| Click CPU, GPU, RAM, fans, cables, or case | Move the camera to the selected component and open the related portfolio section |
| Close panel button | Hide the section panel and return to the default camera view |
| Mouse movement | Dummy follows the pointer with head, neck, and body motion |
| OrbitControls | Pan, rotate, and zoom the camera during exploration |

### Development Shortcuts

| Key | Purpose |
| --- | --- |
| `0` | Return to the default camera preset |
| `F` | Frame the last clicked calibration target |
| `P` | Log the current camera preset |
| `D` | Log the current camera preset as `DEFAULT` |

## Technical Notes

### Scene Architecture

`Experience` is the application entry point. It creates the shared scene, sizes, time loop, camera, renderer, world, and raycaster controller. The update loop is centralized through the `Time` utility and calls the camera, world, raycaster, and renderer every frame.

### Camera System

The camera uses `PerspectiveCamera` and `OrbitControls`. Each clickable portfolio object has a matching camera preset. When the user clicks a target, GSAP interpolates both the camera position and the controls target, producing smooth transitions between sections.

### Interaction System

`RaycasterController` uses a dedicated click layer to detect only the intended interactive objects. Imported meshes whose names start with `CLICK_` become transparent hit targets and receive section metadata. This keeps the visible model independent from the interaction geometry.

### Animation System

Animations are implemented in JavaScript, not imported from Blender.

`DummyAnimator` builds runtime pivots for the mannequin's right shoulder, elbow, and wrist. This allows the arm to wave through hierarchical transformations while the head, neck, and body follow the pointer during idle state.

`AnimatorChain` contains the first logic for a future chain-pull animation: it can move the chain downward, add subtle oscillation, and deform chain mesh vertices for a more flexible motion. The current main interaction already uses the lamp/chain as the power target.

The fan animation rotates multiple fan objects around their configured local axes. Their speed depends on the current power state and changes gradually to avoid abrupt motion.

### Materials And Textures

`ApplyingTexture` assigns materials to imported GLB meshes by reading object names, material names, and parent hierarchy. It supports base color, roughness, normal, and metalness maps, plus transparent materials for glass and cooling tubes.

`ModelMaterialSafety` normalizes imported material flags to avoid unwanted transparency issues. Glass and tube objects keep controlled transparency, while most other meshes are forced back to opaque, double-sided materials.

### Lighting And Post-Processing

The scene combines ambient, directional, cool point, and warm point lights. `PowerExperience` interpolates the light intensities when the scene is turned on or off.

The renderer uses ACES Filmic tone mapping, shadow maps, and an `EffectComposer` pipeline. LED materials are rendered through a selective bloom layer and then composited over the base scene.

## Course Requirements Coverage

| Requirement | Implementation |
| --- | --- |
| Complex model | Custom GLB scene with PC case, internal components, lamp, chain, and Dummy |
| Hierarchical model | Dummy is animated through body, neck, head, shoulder, elbow, wrist, and hand pivots |
| Lights | Ambient, directional, warm/cool point lights, and lamp light |
| Textures | Color, normal, roughness, and metalness maps assigned through `ApplyingTexture` |
| User interaction | Raycast clicks, power toggle, camera transitions, section panel, OrbitControls |
| Animations | Dummy follow/wave, fan rotation, LED breathing, power transition, chain animation groundwork |
| JavaScript animation | Runtime animation logic is implemented in JavaScript with Three.js transforms |

## Current Development Roadmap

- Add particle-like spheres moving through the cooling tubes.
- Add climbing plants and decorative plants around the case.
- Refine shader effects and advanced lighting.
- Replace temporary portfolio copy with final personal content.
- Publish the final build through GitHub Pages.

## Author

Sara Cristina Basco

Interactive Graphics course project, Sapienza University of Rome.
