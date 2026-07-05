import * as THREE from 'three';

export class AnimatorChain {
  constructor({ chainRoot, clickTarget, debug = false }) {
    this.chainRoot = chainRoot;
    this.clickTarget = clickTarget;
    this.debug = debug;
    this.isAnimating = false;
    this.elapsedTime = 0;
    this.deformableMeshes = this.setupDeformableMeshes();

    this.animatedObjects = [chainRoot, clickTarget].filter(Boolean);
    this.neutralTransforms = this.animatedObjects.map((object) => {
      const worldOrigin = new THREE.Vector3();
      const worldDown = new THREE.Vector3();
      const localDown = new THREE.Vector3(0, -0.6, 0);

      object.parent?.updateWorldMatrix(true, false);
      if (object.parent) {
        object.parent.getWorldPosition(worldOrigin);
        worldDown.copy(worldOrigin).add(new THREE.Vector3(0, -0.6, 0));
        object.parent.worldToLocal(worldOrigin);
        object.parent.worldToLocal(worldDown);
        localDown.copy(worldDown).sub(worldOrigin);
      }

      return {
        object,
        position: object.position.clone(),
        rotation: object.rotation.clone(),
        localDown,
      };
    });

    if (!this.chainRoot) {
      console.warn('[AnimatorChain] Visible chain root not found');
    } else if (this.debug) {
      console.log('[AnimatorChain] Visible chain root found:', {
        name: this.chainRoot.name,
        type: this.chainRoot.type,
        children: this.chainRoot.children.length,
      });
    }
  }

  setupDeformableMeshes() {
    if (!this.chainRoot) return [];

    const meshes = [];
    this.chainRoot.traverse((object) => {
      const position = object.geometry?.attributes?.position;
      if (!object.isMesh || !position) return;

      meshes.push({
        mesh: object,
        position,
        originalPositions: new Float32Array(position.array),
      });
    });

    const allYCoordinates = meshes.flatMap(({ originalPositions }) => {
      const coordinates = [];
      for (let index = 1; index < originalPositions.length; index += 3) {
        coordinates.push(originalPositions[index]);
      }
      return coordinates;
    });
    const minY = Math.min(...allYCoordinates);
    const maxY = Math.max(...allYCoordinates);
    const height = Math.max(maxY - minY, Number.EPSILON);

    return meshes.map((meshData) => ({
      ...meshData,
      minY,
      maxY,
      height,
    }));
  }

  trigger() {
    if (this.isAnimating || this.animatedObjects.length === 0) return;

    this.isAnimating = true;
    this.elapsedTime = 0;

    if (this.debug) {
      console.log('[AnimatorChain] animation started');
    }
  }

  update(delta) {
    if (!this.isAnimating) return;

    const deltaTime = delta > 1 ? delta / 1000 : delta;
    this.elapsedTime += deltaTime;

    const downDuration = 0.45;
    const holdDuration = 1.00;
    const upDuration = 0.5;
    const totalDuration = downDuration + holdDuration + upDuration;
    const smoothstep = (value) => value * value * (3 - 2 * value);

    let pullAmount = 1;
    if (this.elapsedTime < downDuration) {
      pullAmount = smoothstep(this.elapsedTime / downDuration);
    } else if (this.elapsedTime > downDuration + holdDuration) {
      const upProgress = THREE.MathUtils.clamp(
        (this.elapsedTime - downDuration - holdDuration) / upDuration,
        0,
        1
      );
      pullAmount = 1 - smoothstep(upProgress);
    }

    const progress = THREE.MathUtils.clamp(
      this.elapsedTime / totalDuration,
      0,
      1
    );
    const oscillationEnvelope = Math.sin(progress * Math.PI);
    const oscillation =
      Math.sin(this.elapsedTime * Math.PI * 4) * oscillationEnvelope;

    this.neutralTransforms.forEach(
      ({ object, position, rotation, localDown }) => {
        object.position.copy(position);
        object.rotation.copy(rotation);
        object.position.addScaledVector(localDown, pullAmount);
        object.rotation.x += oscillation * 0.004;
        object.rotation.z += oscillation * 0.006;
      }
    );

    this.deformChain(oscillationEnvelope);

    if (this.elapsedTime >= totalDuration) {
      this.reset();
    }
  }

  reset() {
    this.neutralTransforms.forEach(({ object, position, rotation }) => {
      object.position.copy(position);
      object.rotation.copy(rotation);
    });
    this.restoreChainGeometry();

    this.isAnimating = false;
    this.elapsedTime = 0;
  }

  deformChain(envelope) {
    const phase = this.elapsedTime * Math.PI * 2.6;

    this.deformableMeshes.forEach(
      ({ position, originalPositions, maxY, height, mesh }) => {
        for (let index = 0; index < originalPositions.length; index += 3) {
          const originalX = originalPositions[index];
          const originalY = originalPositions[index + 1];
          const originalZ = originalPositions[index + 2];
          const distanceFromTop = THREE.MathUtils.clamp(
            (maxY - originalY) / height,
            0,
            1
          );
          const flexibility = distanceFromTop * distanceFromTop;
          const delayedPhase = phase - distanceFromTop * 0.8;

          position.array[index] =
            originalX + Math.sin(delayedPhase) * flexibility * envelope * 0.22;
          position.array[index + 1] = originalY;
          position.array[index + 2] =
            originalZ +
            Math.sin(delayedPhase * 0.72 + 0.9) *
              flexibility *
              envelope *
              0.1;
        }

        position.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
      }
    );
  }

  restoreChainGeometry() {
    this.deformableMeshes.forEach(
      ({ position, originalPositions, mesh }) => {
        position.array.set(originalPositions);
        position.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
      }
    );
  }
}
