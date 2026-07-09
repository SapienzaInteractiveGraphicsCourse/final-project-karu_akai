# Project Asset Comparison: Jesse's Ramen vs InsideMySystem

Analisi eseguita sul progetto locale `interactive-cv` e sul sito pubblico `https://www.jesse-zhou.com/`.

Nota metodologica: il runtime locale e il sito Jesse's Ramen sono stati ispezionati con Chromium headless e DevTools Protocol. Nel browser headless locale Chromium ha segnalato fallback WebGL software, quindi gli FPS locali sono utili come indicatore di stress relativo, non come benchmark hardware assoluto.

## Sintesi

| Area | Jesse's Ramen | InsideMySystem |
|---|---:|---:|
| Trasferimento osservato dopo START | circa 8.8 MiB totali | asset pubblici 56 MiB GLB + 567 MiB texture |
| JS principale | 281 KiB transfer, 993 KiB raw | dev server Vite, non bundle production misurato |
| Modelli 3D | 2 `.gltf`, circa 967 KiB transfer, Draco | `portfolio_case.glb`, 55.3 MiB, no Draco/Meshopt |
| Triangoli modello principale | circa 312k + 12k | circa 1.84M nel GLB |
| Texture runtime | 34 KTX2 + 10 Basis, circa 4.2 MiB transfer | 28 texture esterne usate, 505 MiB su disco |
| Formati texture | KTX2/Basis, atlanti baked, matcap | PNG/JPG 2K/4K, molte normal map pesanti |
| Stima GPU texture esterne | compressa GPU, molto piu bassa | circa 2.1 GiB con mipmap solo per texture esterne usate |
| Post-processing | Bundle contiene EffectComposer, UnrealBloomPass, ShaderPass; no SSAO osservato | Bloom selettivo + SSAO + composite + vignette/color grade + OutputPass |
| Draw calls runtime locale | non misurato direttamente | circa 3.2k draw calls/frame con pipeline completa |
| Materiali runtime | non misurato direttamente | 1,054 materiali runtime, quasi uno per mesh |

Conclusione breve: Jesse's Ramen sembra fluido non perche abbia meno contenuto visivo, ma perche gli asset sono preparati per il web: geometria Draco, texture baked/atlased in KTX2/Basis, pochi modelli, poche centinaia di KiB per texture. InsideMySystem sta caricando molte 4K PNG/JPG non compresse per GPU, un GLB non compresso da 55 MiB e una scena con circa 1.84M triangoli che viene renderizzata piu volte dal post-processing.

## Fonti e limiti

- Sito riferimento: https://www.jesse-zhou.com/
- Case study Daily.dev: https://daily.dev/posts/jesse-s-ramen-3d-portfolio-case-study-vqkfh8uvc
- La pagina Daily.dev espone una scheda/riassunto del post: portfolio interattivo in three.js, estetica cyberpunk ramen shop, pubblicato il 23 novembre 2023, fonte `jesse-zhou.medium.com`.
- I dati Network di Jesse sono stati misurati con cache disabilitata, caricamento pagina, attesa, click su `START`, ulteriore attesa.
- Gli FPS locali sono stati misurati in Chromium headless con WebGL software fallback: il valore assoluto e molto peggiore di un browser desktop con GPU.

## 1. Asset size locale

| Asset | Bytes | Dimensione |
|---|---:|---:|
| `public/models/portfolio_case.glb` | 58,022,036 | 55.3 MiB |
| `public/textures` | 594,847,547 | 567.3 MiB |
| `texture` sorgente | 2,029,612,345 | 1.9 GiB |

`public/textures` contiene 36 file: 18 JPG e 18 PNG. La cartella sorgente `texture/` contiene anche `.blend`, `.zip`, displacement, normal DX/GL e asset non runtime: non dovrebbe stare nel payload pubblico production.

### Top 30 file piu pesanti in `public/models` e `public/textures`

| # | File | Dimensione |
|---:|---|---:|
| 1 | `public/textures/fans/fans-normal.png` | 78.9 MiB |
| 2 | `public/textures/table/table-normal.png` | 76.6 MiB |
| 3 | `public/textures/metal043a/metal-normal.png` | 72.5 MiB |
| 4 | `public/models/portfolio_case.glb` | 55.3 MiB |
| 5 | `public/textures/case/case-normal.png` | 42.8 MiB |
| 6 | `public/textures/plastic013a/plastic-normal.jpg` | 31.5 MiB |
| 7 | `public/textures/table/table-color.png` | 22.7 MiB |
| 8 | `public/textures/plastic004/plastic-normal.png` | 22.6 MiB |
| 9 | `public/textures/metal046a/metal-normal.jpg` | 22.0 MiB |
| 10 | `public/textures/metal045a/metal-normal.jpg` | 21.2 MiB |
| 11 | `public/textures/fans/fans-color.png` | 18.0 MiB |
| 12 | `public/textures/wood034/wood-normal.jpg` | 16.0 MiB |
| 13 | `public/textures/metal043a/metal-color.png` | 14.7 MiB |
| 14 | `public/textures/dummy/dummy-color.jpg` | 14.5 MiB |
| 15 | `public/textures/case/case-color.png` | 14.2 MiB |
| 16 | `public/textures/dummy/dummy-normal.jpg` | 13.7 MiB |
| 17 | `public/textures/fans/fans-roughness.png` | 10.7 MiB |
| 18 | `public/textures/metal045a/metal-color.jpg` | 10.3 MiB |
| 19 | `public/textures/wood034/wood-color.jpg` | 9.3 MiB |
| 20 | `public/textures/plastic013a/plastic-roughness.jpg` | 9.2 MiB |
| 21 | `public/textures/plastic013a/plastic-color.jpg` | 6.5 MiB |
| 22 | `public/textures/metal046a/metal-color.jpg` | 6.4 MiB |
| 23 | `public/textures/table/table-roughness.png` | 5.0 MiB |
| 24 | `public/textures/metal046a/metal-roughness.jpg` | 4.7 MiB |
| 25 | `public/textures/case/case-roughness.png` | 4.1 MiB |
| 26 | `public/textures/metal043a/metal-roughness.png` | 3.9 MiB |
| 27 | `public/textures/dummy/dummy-roughness.jpg` | 3.8 MiB |
| 28 | `public/textures/metal045a/metal-roughness.jpg` | 3.3 MiB |
| 29 | `public/textures/wood034/wood-roughness.jpg` | 3.2 MiB |
| 30 | `public/textures/plastic004/plastic-roughness.png` | 1.9 MiB |

## 2. Texture locale

### Texture effettivamente referenziate dal codice

`ApplyingTexture.js` e `Environment.js` caricano 28 texture esterne:

- `background/library-background.png`
- `case/case-color.png`, `case-normal.png`, `case-roughness.png`
- `dummy/dummy-color.jpg`, `dummy-normal.jpg`, `dummy-roughness.jpg`
- `fans/fans-color.png`, `fans-metalness.png`, `fans-normal.png`, `fans-roughness.png`
- `metal043a/metal-color.png`, `metal-metalness.png`, `metal-normal.png`, `metal-roughness.png`
- `metal045a/metal-color.jpg`, `metal-metalness.jpg`, `metal-normal.jpg`, `metal-roughness.jpg`
- `plastic004/plastic-color.png`, `plastic-normal.png`, `plastic-roughness.png`
- `plastic013a/plastic-color.jpg`, `plastic-normal.jpg`, `plastic-roughness.jpg`
- `table/table-color.png`, `table-normal.png`, `table-roughness.png`

Peso texture usate: 505.4 MiB su disco.

Stima memoria GPU/RAM se caricate RGBA8 con mipmap: circa 2.1 GiB. Questo non include texture embedded del GLB, render target del post-processing, shadow map, canvas texture e PMREM.

### Texture non usate direttamente dal codice

Queste 8 texture sono in `public/textures`, ma non risultano referenziate dai file JS letti:

- `metal046a/*` 4 file
- `wood034/*` 3 file
- `wood-warm.jpg`

Peso non usato nel codice: circa 61.9 MiB. Non dovrebbero essere scaricate se non richieste, ma pesano nel repo e possono finire per errore in deploy/static hosting.

### Tabella texture pubbliche

Stima GPU: `width * height * 4`, piu circa 33% per mipmap. In WebGL le PNG/JPG decodificate non restano piccole come su disco.

| File | Formato | Risoluzione | Disco | GPU RGBA | GPU + mipmap | Alpha | Flag |
|---|---:|---:|---:|---:|---:|---|---|
| `public/textures/fans/fans-normal.png` | PNG | 4096x4096 | 78.9 MiB | 64.0 MiB | 85.3 MiB | no | >2048, PNG senza alpha reale |
| `public/textures/table/table-normal.png` | PNG | 4096x4096 | 76.6 MiB | 64.0 MiB | 85.3 MiB | no | >2048, PNG senza alpha reale |
| `public/textures/metal043a/metal-normal.png` | PNG | 4096x4096 | 72.5 MiB | 64.0 MiB | 85.3 MiB | no | >2048, PNG senza alpha reale |
| `public/textures/case/case-normal.png` | PNG | 4096x4096 | 42.8 MiB | 64.0 MiB | 85.3 MiB | no | >2048, PNG senza alpha reale |
| `public/textures/plastic013a/plastic-normal.jpg` | JPG | 4096x4096 | 31.5 MiB | 64.0 MiB | 85.3 MiB | no | >2048 |
| `public/textures/table/table-color.png` | PNG | 4096x4096 | 22.7 MiB | 64.0 MiB | 85.3 MiB | no | >2048, PNG senza alpha reale |
| `public/textures/plastic004/plastic-normal.png` | PNG | 2048x2048 | 22.6 MiB | 16.0 MiB | 21.3 MiB | no | >1024, PNG senza alpha reale |
| `public/textures/metal046a/metal-normal.jpg` | JPG | 4096x4096 | 22.0 MiB | 64.0 MiB | 85.3 MiB | no | >2048, non referenziata |
| `public/textures/metal045a/metal-normal.jpg` | JPG | 4096x4096 | 21.2 MiB | 64.0 MiB | 85.3 MiB | no | >2048 |
| `public/textures/fans/fans-color.png` | PNG | 4096x4096 | 18.0 MiB | 64.0 MiB | 85.3 MiB | no | >2048, PNG senza alpha reale |
| `public/textures/wood034/wood-normal.jpg` | JPG | 4096x2048 | 16.0 MiB | 32.0 MiB | 42.7 MiB | no | >2048, non referenziata |
| `public/textures/metal043a/metal-color.png` | PNG | 4096x4096 | 14.7 MiB | 64.0 MiB | 85.3 MiB | no | >2048, PNG senza alpha reale |
| `public/textures/dummy/dummy-color.jpg` | JPG | 4096x4096 | 14.5 MiB | 64.0 MiB | 85.3 MiB | no | >2048 |
| `public/textures/case/case-color.png` | PNG | 4096x4096 | 14.2 MiB | 64.0 MiB | 85.3 MiB | no | >2048, PNG senza alpha reale |
| `public/textures/dummy/dummy-normal.jpg` | JPG | 4096x4096 | 13.7 MiB | 64.0 MiB | 85.3 MiB | no | >2048 |
| `public/textures/fans/fans-roughness.png` | PNG | 4096x4096 | 10.7 MiB | 64.0 MiB | 85.3 MiB | no | >2048, PNG senza alpha reale |
| `public/textures/metal045a/metal-color.jpg` | JPG | 4096x4096 | 10.3 MiB | 64.0 MiB | 85.3 MiB | no | >2048 |
| `public/textures/wood034/wood-color.jpg` | JPG | 4096x2048 | 9.3 MiB | 32.0 MiB | 42.7 MiB | no | >2048, non referenziata |
| `public/textures/plastic013a/plastic-roughness.jpg` | JPG | 4096x4096 | 9.2 MiB | 64.0 MiB | 85.3 MiB | no | >2048 |
| `public/textures/plastic013a/plastic-color.jpg` | JPG | 4096x4096 | 6.5 MiB | 64.0 MiB | 85.3 MiB | no | >2048 |
| `public/textures/metal046a/metal-color.jpg` | JPG | 4096x4096 | 6.4 MiB | 64.0 MiB | 85.3 MiB | no | >2048, non referenziata |
| `public/textures/table/table-roughness.png` | PNG | 4096x4096 | 5.0 MiB | 64.0 MiB | 85.3 MiB | no | >2048, PNG senza alpha reale |
| `public/textures/metal046a/metal-roughness.jpg` | JPG | 4096x4096 | 4.7 MiB | 64.0 MiB | 85.3 MiB | no | >2048, non referenziata |
| `public/textures/case/case-roughness.png` | PNG | 4096x4096 | 4.1 MiB | 64.0 MiB | 85.3 MiB | no | >2048, PNG senza alpha reale |
| `public/textures/metal043a/metal-roughness.png` | PNG | 4096x4096 | 3.9 MiB | 64.0 MiB | 85.3 MiB | no | >2048, PNG senza alpha reale |
| `public/textures/dummy/dummy-roughness.jpg` | JPG | 4096x4096 | 3.8 MiB | 64.0 MiB | 85.3 MiB | no | >2048 |
| `public/textures/metal045a/metal-roughness.jpg` | JPG | 4096x4096 | 3.3 MiB | 64.0 MiB | 85.3 MiB | no | >2048 |
| `public/textures/wood034/wood-roughness.jpg` | JPG | 4096x2048 | 3.2 MiB | 32.0 MiB | 42.7 MiB | no | >2048, non referenziata |
| `public/textures/plastic004/plastic-roughness.png` | PNG | 2048x2048 | 1.9 MiB | 16.0 MiB | 21.3 MiB | no | >1024, PNG senza alpha reale |
| `public/textures/background/library-background.png` | PNG | 1536x1024 | 1.6 MiB | 6.0 MiB | 8.0 MiB | no | >1024, PNG senza alpha reale |
| `public/textures/plastic004/plastic-color.png` | PNG | 2048x2048 | 1.0 MiB | 16.0 MiB | 21.3 MiB | no | >1024, PNG senza alpha reale |
| `public/textures/wood-warm.jpg` | JPG | 1024x1024 | 194.9 KiB | 4.0 MiB | 5.3 MiB | no | non referenziata |
| `public/textures/metal045a/metal-metalness.jpg` | JPG | 4096x4096 | 65.2 KiB | 64.0 MiB | 85.3 MiB | no | >2048 |
| `public/textures/metal046a/metal-metalness.jpg` | JPG | 4096x4096 | 65.2 KiB | 64.0 MiB | 85.3 MiB | no | >2048, non referenziata |
| `public/textures/metal043a/metal-metalness.png` | PNG | 4096x4096 | 23.1 KiB | 64.0 MiB | 85.3 MiB | no | >2048, PNG senza alpha reale |
| `public/textures/fans/fans-metalness.png` | PNG | 4096x4096 | 6.8 KiB | 64.0 MiB | 85.3 MiB | no | >2048, PNG senza alpha reale |

Osservazione critica: le due metalness da pochi KiB (`fans-metalness.png`, `metal043a/metal-metalness.png`) costano comunque circa 85 MiB ciascuna in GPU con mipmap perche sono 4096x4096. Questi sono ottimi candidati per riduzione drastica o channel packing.

## 3. GLB locale

### Statistiche `portfolio_case.glb`

| Metrica | Valore |
|---|---:|
| Dimensione GLB | 58,022,036 bytes / 55.3 MiB |
| JSON chunk | 1,194,800 bytes |
| BIN chunk | 56,827,208 bytes |
| Nodes | 2,067 |
| Mesh definitions | 888 |
| Mesh nodes in scene | 888 |
| Materials | 147 |
| Accessors | 3,603 |
| BufferViews | 3,614 |
| Images embedded | 11 |
| Textures embedded | 21 |
| Animations | 1 |
| Skins | 0 |
| Triangoli approssimati | 1,841,372 |
| Triangoli static-candidate | 1,551,186 |
| Triangoli protetti/interattivi | 290,186 |
| Compressione geometry | assente |
| Estensioni usate | `KHR_materials_emissive_strength`, `KHR_materials_specular`, `KHR_materials_ior` |

Il GLB include 11 immagini embedded per circa 5.2 MiB su disco. Stima GPU se caricate una volta con mipmap: circa 107 MiB. Il runtime sostituisce molte texture/materiali con mappe esterne, ma alcune texture embedded restano presenti per lampada, piante, elementi importati e materiali non sovrascritti.

### Top 30 mesh per triangoli

| # | Node | Mesh | Parent | Tris | Prims | Materiali | Fondere? |
|---:|---|---|---|---:|---:|---|---|
| 1 | `BezierCurve.002` | `BezierCurve.002` | scene | 111,744 | 1 | `476823` | forse |
| 2 | `Tubes` | `BezierCurve.003` | scene | 111,744 | 1 | `476823` | NO |
| 3 | `Cube.290` | `Cube.290` | scene | 99,940 | 1 | `1234628` | forse |
| 4 | `BezierCurve.010` | `BezierCurve.010` | scene | 36,864 | 1 | `26345` | forse |
| 5 | `BezierCurve.011` | `BezierCurve.011` | scene | 36,864 | 1 | `476823` | forse |
| 6 | `BezierCurve.012` | `BezierCurve.012` | scene | 36,864 | 1 | `26345` | forse |
| 7 | `BezierCurve.013` | `BezierCurve.013` | scene | 36,864 | 1 | `476823` | forse |
| 8 | `BezierCurve.004` | `BezierCurve.004` | scene | 30,430 | 2 | `476823`, `,kz.001` | forse |
| 9 | `Tubes.002` | `BezierCurve.005` | scene | 30,430 | 2 | `476823`, `,kz.001` | NO |
| 10 | `BezierCurve.006` | `BezierCurve.006` | scene | 30,430 | 2 | `476823`, `,kz.001` | forse |
| 11 | `Tubes.003` | `BezierCurve.007` | scene | 30,430 | 2 | `476823`, `,kz.001` | NO |
| 12 | `BezierCurve.008` | `BezierCurve.008` | scene | 30,430 | 2 | `476823`, `,kz.001` | forse |
| 13 | `Tubes.001` | `BezierCurve.009` | scene | 30,430 | 2 | `476823`, `,kz.001` | NO |
| 14 | `Cylinder.096` | `Cylinder.106` | scene | 29,788 | 2 | `3567`, `967870-` | forse |
| 15 | `Curve.083` | `Curve.083` | scene | 27,888 | 3 | `3567`, `Rog.003`, `46578236` | forse |
| 16 | `Curve.085` | `Curve.085` | scene | 27,888 | 3 | `3567`, `Rog.003`, `46578236` | forse |
| 17 | `plant` | `leaf.001_Material.001_0` | `leaf.001` | 26,992 | 1 | `Material.015` | forse |
| 18 | `plant.001` | `leaf.001_Material.001_0.003` | `leaf.001` | 26,992 | 1 | `Material.015` | forse |
| 19 | `plant.002` | `leaf.001_Material.001_0.004` | `leaf.001` | 26,992 | 1 | `Material.015` | forse |
| 20 | `plant.003` | `leaf.001_Material.001_0.005` | `leaf.001` | 26,992 | 1 | `Material.015` | forse |
| 21 | `plant.004` | `leaf.001_Material.001_0.006` | `leaf.001` | 26,992 | 1 | `Material.015` | forse |
| 22 | `plant.005` | `leaf.001_Material.001_0.007` | `leaf.001` | 26,992 | 1 | `Material.015` | forse |
| 23 | `plant.006` | `leaf.001_Material.001_0.008` | `leaf.001` | 26,992 | 1 | `Material.015` | forse |
| 24 | `case_upside` | `Cube.242` | scene | 25,563 | 3 | `Material.023`, `Material.024`, `NZXT` | forse |
| 25 | `gpu_outside` | `Plane.148` | scene | 19,445 | 3 | `3567`, `Material.001`, `Material.019` | forse |
| 26 | `Curve.074` | `Curve.074` | scene | 16,862 | 1 | `234573` | forse |
| 27 | `chain.001` | `Torus_Material.007_0.001` | `Torus` | 16,128 | 7 | multi-material | NO |
| 28 | `foot.004` | `Cube.001` | scene | 15,360 | 1 | `345` | forse |
| 29 | `foot.002` | `Cube.003` | scene | 15,360 | 1 | `345` | forse |
| 30 | `foot` | `Cube.004` | scene | 15,360 | 1 | `345` | forse |

### Mesh statiche potenzialmente fondibili

Questi sono gruppi euristici: mesh statiche, non protette da nomi/animazioni note, raggruppate per materiale. Vanno confermate visivamente in Blender/Three.js prima di merge.

| Materiale/i | Mesh statiche | Tris | Esempi |
|---|---:|---:|---|
| `Material.015` | 7 | 188,944 | `plant`, `plant.001`, `plant.002`, `plant.003` |
| `1234628` | 6 | 102,880 | `Cube.279`, `Cube.282`, `Cube.283`, `Cube.284` |
| `345` | 47 | 63,900 | `foot.004`, `foot.002`, `foot`, `foot.001` |
| `5`, `345` | 24 | 62,208 | `Cube.150`, `Cube.151`, `Cube.152`, `Cube.153` |
| `,kz` | 49 | 59,186 | `fan_circle.002`, `fan_circle.001`, `fan_circle` |
| `RAM_cAge.006` | 6 | 34,864 | `memory`, `memory.001`, `memory.002` |
| `5654`, `78969` | 18 | 34,682 | `Cube.021`, `Cube.033`, `Cube.036` |
| `78969` | 73 | 32,410 | `Cube.006`, `Cube.007`, `Cube.008` |
| `5264980` | 11 | 29,488 | `BezierCircle`, `Cylinder.097`, `Cylinder.098` |
| `KOHDEHCATOP`, `43576453` | 36 | 28,656 | `Cylinder.003`, `Cylinder.004`, `Cylinder.005` |
| `234573` | 11 | 26,210 | `Curve.074`, `Curve.075`, `Cylinder.107` |
| `5654` | 113 | 15,814 | molte `Cube.*` |
| `564334567` | 23 | 14,732 | `Screws`, `Screws_fan`, `Cylinder.169` |

### Mesh animate/interattive da NON fondere

Da preservare separatamente:

- Click target: `CLICK_GPU`, `CLICK_CPU`, `CLICK_FANS`, `CLICK_DUMMY`, `CLICK_RAM`, `CLICK_CABLES`, `CLICK_CHAIN`.
- Dummy: subtree `Dummy_root` e parti `Dummy_*`, animate da `DummyAnimator`.
- Catena: `chain.001` e `CLICK_CHAIN`, usati da `AnimatorChain` e `PowerExperience`.
- Fan rotors: `FAN_ROT_Y_1`, `FAN_ROT_Y_2`, `FAN_ROT_Y_3`, `FAN_ROT_Z_1..6`, `FAN_ROT_X`.
- Tubi/flow: `Tubes`, `Tubes.001`, `Tubes.002`, `Tubes.003`, `Tube`, `Tube.001` e oggetti nominati tube/pipe/hose/cooling.
- CPU power visuals: `CPU_CENTRAL_RING`, `CPU_CENTRAL_DISC` o typo `CPU_CENTRAL_DISCK`.
- Lampada: `LAMPADA DA TAVOLO_3`, `LAMPADINA_4` e parti usate da `ExtraLight`/`PowerExperience`.
- Materiali o mesh glass espliciti: da valutare separatamente per trasparenza e depth sorting.

## 4. Runtime attuale locale

Misura: Chromium headless, canvas 780x493, DPR 1, WebGL software fallback. `renderer.info.autoReset=false` durante una finestra di circa 5 secondi e divisione per tick dell'app.

| Stato | Draw calls/frame | Triangoli/frame | Texture renderer | Programmi | FPS medio | Frame time medio | P95 frame time | Crash |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Power off | circa 3,206 | circa 5.83M | 64 | 37 | 0.91 | circa 1100 ms | circa 1117 ms | no |
| Power on | circa 3,208 | circa 5.83M | 64 | 37 | 0.90 | circa 1100 ms | circa 1100 ms | no |

Stato WebGL: `contextLost=false`, loading screen nascosto, modello caricato.

Non ho trovato una modalita alleggerita ancora presente nel codice. La differenza misurabile e tra power off/on, che cambia luci, LED, fan e animazioni ma non riduce la complessita base della scena.

### Statistiche runtime scena

| Metrica runtime | Valore |
|---|---:|
| Nodes sotto loaded model | 2,373 |
| Mesh runtime | 1,054 |
| Mesh visibili | 1,047 |
| Materiali runtime unici | 1,054 |
| Texture uniche usate dai materiali | 37 |
| `renderer.info.memory.geometries` | 1,046 |
| `renderer.info.memory.textures` | 64 |
| Mesh/material slots DoubleSide | 1,039 |
| Mesh che castano shadow | 1,031 |
| Mesh che ricevono shadow | 1,044 |
| Material slots trasparenti | 17 |

Punti critici:

- `secureModelMaterials` forza quasi tutto a `DoubleSide`. Questo puo raddoppiare fragment work e peggiorare sorting/overdraw.
- `setupVisibleMesh` abilita cast/receive shadow quasi ovunque.
- `ApplyingTexture.applyToModel` clona materiali per mesh. Il risultato runtime e praticamente un materiale per ogni mesh.
- Il renderer non fa un solo pass: bloom selettivo, render base, SSAO, composite, vignette/color grade e OutputPass moltiplicano draw calls e triangoli renderizzati.

## 5. Confronto con Jesse's Ramen

### Network osservato Jesse's Ramen

Dopo click su `START`:

| Categoria | Count | Transfer |
|---|---:|---:|
| Totale richieste osservate | 73 | 8.8 MiB |
| JS | 3 | 303.3 KiB |
| Modelli `.gltf` | 2 | 967.2 KiB |
| KTX2 | 34 | 4.1 MiB |
| Basis | 10 | 130.8 KiB |
| Video `.mp4` | 8 | 2.2 MiB |
| Audio `.mp3` | 7 | 873.8 KiB |
| WASM Draco/Basis | 2 | 320.4 KiB |

JS principale:

- `bundle.7d6f6f7fdd10db02.js`: 281.0 KiB transfer, circa 992.6 KiB raw.
- `basis_transcoder.js`: 11.9 KiB.
- `draco_wasm_wrapper.js`: 10.3 KiB.

Modelli:

| Modello | Transfer | Raw JSON | Nodes | Meshes | Materials | Draco primitives | Triangoli approx |
|---|---:|---:|---:|---:|---:|---:|---:|
| `ramenShop.gltf` | 928.1 KiB | 1.4 MiB | 51 | 51 | 0 | 51 | 312,741 |
| `ramenHologram.gltf` | 39.1 KiB | 66.7 KiB | 8 | 8 | 4 | 8 | 11,932 |

Entrambi usano `KHR_draco_mesh_compression` come estensione required. I buffer Draco sono embedded come data URI nel `.gltf`; non sono stati osservati `.bin` separati.

Texture:

- 34 `.ktx2`, circa 4.1 MiB transfer.
- 10 `.basis`, circa 130.8 KiB transfer.
- 2 PNG minime/matcap, circa 11.3 KiB.
- Baked texture principali: `floorBaked1024.ktx2`, `ramenShopBaked1024.ktx2`, `machinesBaked1024.ktx2`, `miscBaked1024.ktx2`.
- Molte screen texture sono 1024/2048 KTX2; alcune 4096 KTX2 restano sotto 150-450 KiB grazie alla compressione texture.

Esempi KTX2:

| Texture | Risoluzione | Transfer |
|---|---:|---:|
| `textures/baked/floorBaked1024.ktx2` | 1024x1024 | 705.4 KiB |
| `textures/baked/ramenShopBaked1024.ktx2` | 1024x1024 | 535.1 KiB |
| `textures/baked/machinesBaked1024.ktx2` | 1024x1024 | 503.2 KiB |
| `textures/baked/miscBaked1024.ktx2` | 4096x4096 | 450.4 KiB |
| `textures/screens/sideScreens/sideScreen2.ktx2` | 2048x2048 | 200.3 KiB |
| `textures/screens/easel/easelTouch.ktx2` | 4096x4096 | 150.0 KiB |
| `textures/screens/easel/easelClick.ktx2` | 4096x4096 | 145.1 KiB |

### Compressione e pipeline osservata

| Tecnica | Jesse's Ramen | InsideMySystem |
|---|---|---|
| Draco | si, required nei due GLTF | no |
| Meshopt | bundle contiene stringa `MeshoptDecoder`, ma i GLTF osservati non usano `EXT_meshopt` | no |
| KTX2/Basis | si, texture principali | no |
| WebP | non osservato | no |
| Texture baked/atlased | si, nomi `baked/*` e pochi atlanti principali | no, mappe PBR separate per materiale |
| Post-processing | bundle contiene `EffectComposer`, `UnrealBloomPass`, `ShaderPass`, `WebGLRenderTarget`; no `SSAOPass` osservato | si: bloom + SSAO + composite + vignette |
| Progress/lazy loading | loader iniziale con percentuale e bottone START; molte risorse caricate come fetch dopo bootstrap | loading screen locale, ma tutte le texture principali vengono create/caricate subito in `ApplyingTexture` |

## 6. Colli di bottiglia InsideMySystem

1. Texture 4K non compresse per GPU

Le 28 texture effettivamente usate pesano 505 MiB su disco e circa 2.1 GiB in GPU con mipmap. Questo da solo puo causare freeze, context loss o crash su laptop/integrate/mobile.

2. PNG senza alpha reale

Tutti i 18 PNG pubblici analizzati non hanno alpha reale. Quasi tutti possono diventare JPG/WebP/KTX2 oppure essere impacchettati in atlanti/channel pack.

3. Metalness/roughness 4K a costo nascosto

`fans-metalness.png` pesa solo 6.8 KiB su disco, ma in GPU costa come una 4096 RGBA: circa 85 MiB con mipmap. Le mappe scalar dovrebbero essere molto piu piccole o impacchettate.

4. GLB grande e non compresso

`portfolio_case.glb` pesa 55.3 MiB e non usa Draco/Meshopt. Jesse scarica due GLTF Draco per meno di 1 MiB transfer complessivo lato modelli.

5. Geometria troppo alta

Il GLB locale contiene circa 1.84M triangoli. Con post-processing multi-pass, il runtime arriva a circa 5.83M triangoli renderizzati per frame in headless.

6. Troppi draw calls

Circa 3.2k draw calls/frame nel runtime locale. La causa probabile e combinata: 1,054 mesh/materiali, materiali clonati per mesh, DoubleSide quasi globale, shadow flags quasi globali e pipeline post-processing.

7. Material clone per mesh

Il runtime ha 1,054 materiali unici per 1,054 mesh. Questo elimina gran parte del riuso materiale e rende piu difficile batching/merge.

8. Shadow e DoubleSide quasi ovunque

1,031 mesh castano shadow e 1,044 ricevono shadow. 1,039 material slots sono DoubleSide. Sono impostazioni costose da usare come default globale.

9. Post-processing prima del budget asset

SSAO + bloom selettivo + composite + vignette sono belli, ma moltiplicano il costo di una scena gia troppo pesante.

10. Asset sorgente e runtime mescolati

`texture/` e 1.9 GiB. `public/textures` ha anche texture non referenziate. Serve una distinzione netta tra source assets e optimized runtime assets.

## 7. Priorita di intervento

### P0 - Definire budget production

Target consigliato:

| Metrica | Target desktop | Target mobile/low |
|---|---:|---:|
| Transfer iniziale totale | 20-30 MiB max | 8-15 MiB |
| GLB/GLTF principale | 5-10 MiB max | 3-6 MiB |
| Texture residenti GPU | 256-512 MiB max | 128-256 MiB |
| Triangoli visibili | 300k-600k | 150k-300k |
| Draw calls | <300 ideale, <500 accettabile | <200 |
| DPR | max 1.5 desktop | max 1.0 low/mobile |

Jesse e un buon riferimento: circa 8.8 MiB transfer totale osservato, texture GPU-compressed, geometry Draco, circa 325k triangoli tra i due GLTF.

### P1 - Texture pipeline

- Convertire texture runtime in KTX2/BasisU per GPU.
- Ridurre normal/color principali a 1024 o 2048 salvo hero close-up verificati.
- Eliminare 4K per metalness/roughness standalone.
- Usare channel packing: ORM oppure R/M/A in canali separati di una singola texture.
- Convertire PNG senza alpha reale in JPG/WebP/KTX2.
- Creare atlanti baked per parti statiche del case/desk invece di PBR triplet per ogni materiale.
- Separare `texture/` sorgente da `public/textures` ottimizzate.

### P2 - GLB e geometria

- Esportare GLB/GLTF con Draco o Meshopt.
- Decimare curve/tubi e mesh ripetute ad alto numero di triangoli.
- Semplificare piante: le 7 plant mesh valgono circa 189k triangoli.
- Fondere statiche per materiale quando non interattive.
- Usare instancing per viti, cilindri, piccoli componenti, LED ripetuti.
- Tenere separati fan, dummy, chain, click targets, lampada e CPU power visuals.

### P3 - Runtime rendering

- Disattivare `DoubleSide` di default; abilitarlo solo dove necessario.
- Disattivare cast/receive shadow di default e abilitarlo per pochi oggetti grandi.
- Escludere piccoli dettagli e mesh invisibili da shadow/SSAO.
- Evitare clone materiale per ogni mesh se il materiale e identico.
- Creare modalita lightweight reale: no SSAO, bloom ridotto/spento, DPR 1, texture LOD piu bassa.
- Caricare texture high-detail on demand, non tutte nel costruttore.

### P4 - Verifica production

- Build production e Network audit.
- Test desktop + mobile + laptop integrata.
- Test WebGL context loss.
- Script CI che fallisce se `public/textures` o GLB superano budget.
- Screenshot/perf smoke test con `renderer.info` e FPS.

## 8. Cosa NON fare

- Non aggiungere altre texture 4K PNG/JPG.
- Non giudicare il costo texture dal peso su disco: in GPU una 4096x4096 costa decine di MiB anche se il file e piccolo.
- Non fondere mesh animate/interattive: dummy, fan rotors, chain, click proxies, lampada, CPU power visuals, tube flow.
- Non aggiungere altro post-processing prima di ridurre asset e draw calls.
- Non tenere displacement/DX normal/source `.blend`/zip dentro il payload pubblico.
- Non usare `DoubleSide`, shadow e materiali clonati come default globale.
- Non ottimizzare solo il JS bundle: il collo di bottiglia principale e asset GPU, non codice applicativo.

## 9. Piano pratico per una production fluida

1. Congelare asset budget e misurazione

Creare uno script read-only che stampa: peso GLB, peso texture, risoluzioni, triangoli, top mesh, `renderer.info`. Questo report puo diventare il baseline.

2. Rifare texture runtime

Partire dalle 28 texture caricate. Ridurre a pochi atlanti KTX2:

- case/table/fans/componenti statici baked;
- normal map solo dove visivamente necessaria;
- roughness/metalness impacchettate;
- background ottimizzato;
- niente PNG senza alpha reale.

Obiettivo intermedio: da 505 MiB texture usate a <50 MiB transfer, poi verso 10-25 MiB con KTX2/Basis.

3. Ottimizzare modello

In Blender:

- decimare piante/tubi/curve;
- applicare naming pulito;
- fondere statiche per materiale;
- instanziare ripetizioni;
- esportare Draco o Meshopt;
- mantenere separati tutti gli oggetti interattivi.

Obiettivo intermedio: GLB/GLTF principale <10 MiB transfer e <600k triangoli.

4. Ridurre costo runtime

Dopo asset pass:

- riusare materiali dove possibile;
- ridurre draw calls sotto 500;
- shadows solo su oggetti grandi;
- DoubleSide solo su foglie/glass/parti sottili confermate;
- SSAO e bloom configurabili da quality preset.

5. Aggiungere modalita quality

Preset suggeriti:

- `high`: KTX2 2K per hero, bloom, SSAO ridotta, DPR max 1.5.
- `balanced`: KTX2 1K/2K, bloom leggero, no SSAO o SSAO 0.35, DPR max 1.25.
- `low`: KTX2 1K, no SSAO, bloom off/light, shadows minime, DPR 1.

6. Validare come Jesse

Ripetere un audit Network stile Jesse:

- totale richieste;
- transfer totale;
- JS transfer/raw;
- modelli 3D transfer;
- texture transfer e formati;
- Draco/Meshopt/KTX2 presenti;
- `renderer.info` runtime.

Target realistico: non copiare l'estetica di Jesse, ma arrivare alla stessa disciplina di pipeline: contenuto ricco, asset compressi, geometria controllata, poche texture residenti, progress loading chiaro.

