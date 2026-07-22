'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  FLIGHT_PHASES,
  createFlyingCarouselLayout,
  sampleFlyingCard,
} from '../../lib/flyingCarouselLayout.mjs';
import { labFlight, setLabReady } from '../../lib/labFlight.mjs';
import { MOTION_STUDIES } from '../../lib/motionStudies.mjs';
import { scrollState } from '../../lib/scrollState';
import { CLUSTERS, LAB_WINDOW, STOPS } from '../../lib/journey';

// The lab beat's WebGL stage. Same flight machinery as FlyingCarousel, but
// dressed as the design lab: cream concept-study cards over a paper backdrop
// that carries the giant DESIGN IN MOTION statement, so the cards genuinely
// fly in front of the type instead of under a DOM overlay.
const CWS_BLUE = '#3c6cff';
const CWS_CYAN = '#59f3ff';
const FRAME = '#ccd2d8';
const PAPER = '#d7d6d2';
const INK = '#292a27';
const CARD_FACE = '#f4f3ef';
const CARD_INK = '#11130f';
const FACE_OFFSET = 0.0185;
// A different scatter seed than the Selected Work beat, so the two flights
// share physics but never read as the same choreography twice.
const LAB_SEED = 0x1ab5eed;
const LAB_STOP = STOPS.find((stop) => stop.look[2] === CLUSTERS.lab);
const LAB_DISTANCE = Math.hypot(
  LAB_STOP.pos[0] - LAB_STOP.look[0],
  LAB_STOP.pos[1] - LAB_STOP.look[1],
  LAB_STOP.pos[2] - LAB_STOP.look[2],
);
const LAB_FOV = 42;

function visibleWorldWidth(pixelWidth, pixelHeight) {
  const aspect = pixelWidth / Math.max(pixelHeight, 1);
  const height = 2 * Math.tan(THREE.MathUtils.degToRad(LAB_FOV) / 2) * LAB_DISTANCE;
  return height * aspect;
}

function roundedRectPath(context, x, y, width, height, radius) {
  const right = x + width;
  const bottom = y + height;

  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(right - radius, y);
  context.quadraticCurveTo(right, y, right, y + radius);
  context.lineTo(right, bottom - radius);
  context.quadraticCurveTo(right, bottom, right - radius, bottom);
  context.lineTo(x + radius, bottom);
  context.quadraticCurveTo(x, bottom, x, bottom - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function createCanvasTexture(canvas, anisotropy) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createLabBackdropTexture(anisotropy, textureWidth) {
  const canvas = document.createElement('canvas');
  canvas.width = textureWidth;
  canvas.height = Math.round(textureWidth * (2 / 3));

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    throw new Error('LabCarousel could not create its procedural backdrop.');
  }

  const width = canvas.width;
  const height = canvas.height;
  context.fillStyle = PAPER;
  context.fillRect(0, 0, width, height);

  // The same faint ruling the DOM sticky draws, so legacy and WebGL modes
  // share one surface language.
  context.save();
  context.strokeStyle = 'rgba(36, 38, 34, 0.055)';
  context.lineWidth = 2;
  for (let index = 1; index < 10; index++) {
    const y = height * index * 0.1;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.restore();

  // The giant statement lives on the backdrop here (not the DOM), so the
  // cards fly in front of the type.
  context.fillStyle = 'rgba(51, 53, 49, 0.92)';
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.font = `400 ${Math.round(height * 0.26)}px "Space Grotesk", Arial, sans-serif`;
  context.fillText('DESIGN IN', width * 0.03, height * 0.42);
  context.fillText('MOTION', width * 0.03, height * 0.63);

  return createCanvasTexture(canvas, anisotropy);
}

function createLabStudyTexture(study, index, anisotropy, textureWidth) {
  const canvas = document.createElement('canvas');
  const textureHeight = Math.round(textureWidth * (CARD_HEIGHT / CARD_WIDTH));
  canvas.width = textureWidth;
  canvas.height = textureHeight;

  const context = canvas.getContext('2d', { alpha: true });
  if (!context) {
    throw new Error('LabCarousel could not create a procedural card texture.');
  }

  const width = textureWidth;
  const height = textureHeight;
  const number = String(index + 1).padStart(2, '0');
  const inset = Math.max(5, height * 0.012);
  const radius = height * 0.05;
  const left = width * 0.055;
  const right = width * 0.945;

  context.clearRect(0, 0, width, height);
  context.save();
  roundedRectPath(context, inset, inset, width - inset * 2, height - inset * 2, radius);
  context.clip();

  context.fillStyle = CARD_FACE;
  context.fillRect(0, 0, width, height);

  // Flat colour field, faithful to the SMIL card art.
  const artX = width * 0.0375;
  const artY = height * 0.1;
  const artW = width * 0.925;
  const artH = height * 0.6;
  context.fillStyle = study.color;
  context.fillRect(artX, artY, artW, artH);

  // Soft sheen so the flat field reads as a surface under the beat's lights.
  context.save();
  context.globalAlpha = 0.16;
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.moveTo(artX + artW * 0.62, artY);
  context.lineTo(artX + artW, artY);
  context.lineTo(artX + artW, artY + artH * 0.55);
  context.closePath();
  context.fill();
  context.restore();

  // The dark sweep and accent dot, drawn per-index like the SVG cards.
  context.save();
  context.beginPath();
  context.rect(artX, artY, artW, artH);
  context.clip();
  context.strokeStyle = '#0b0d0b';
  context.lineCap = 'round';
  context.lineWidth = height * 0.024;
  context.beginPath();
  context.moveTo(width * 0.085, artY + artH * (0.83 - index * 0.03));
  context.bezierCurveTo(
    width * 0.29, artY + artH * (0.17 + index * 0.06),
    width * 0.59, artY + artH * (1.05 - index * 0.05),
    width * 0.91, artY + artH * (0.16 + index * 0.04),
  );
  context.stroke();
  context.fillStyle = 'rgba(11, 13, 11, 0.9)';
  context.beginPath();
  context.arc(
    width * (0.18 + index * 0.097),
    artY + artH * (0.32 + (index % 2) * 0.32),
    height * (0.055 + index * 0.006),
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();

  // Header row: provenance left, index right.
  context.textBaseline = 'middle';
  context.textAlign = 'left';
  context.fillStyle = '#202832';
  context.font = `700 ${Math.round(height * 0.034)}px "Space Mono", Consolas, monospace`;
  context.fillText('CWS / MOTION STUDY', left, height * 0.055);
  context.textAlign = 'right';
  context.fillStyle = CWS_BLUE;
  context.font = `700 ${Math.round(height * 0.056)}px "Space Mono", Consolas, monospace`;
  context.fillText(number, right, height * 0.055);

  // Footer: study title and subtitle.
  context.textAlign = 'left';
  context.fillStyle = CARD_INK;
  context.font = `700 ${Math.round(height * 0.078)}px "Space Mono", Consolas, monospace`;
  context.fillText(study.title, left, height * 0.795, width * 0.7);
  context.fillStyle = '#3e4650';
  context.font = `500 ${Math.round(height * 0.05)}px "Space Mono", Consolas, monospace`;
  context.fillText(study.subtitle.toUpperCase(), left, height * 0.9, width * 0.68);

  context.restore();

  roundedRectPath(context, inset, inset, width - inset * 2, height - inset * 2, radius);
  context.lineWidth = Math.max(2, height * 0.007);
  context.strokeStyle = CARD_INK;
  context.stroke();

  return createCanvasTexture(canvas, anisotropy);
}

function disposeLabResources(resources) {
  resources.backdropGeometry.dispose();
  resources.backdropMaterial.dispose();
  resources.backdropTexture.dispose();
  resources.frameGeometry.dispose();
  resources.faceGeometry.dispose();
  resources.frameMaterial.dispose();

  for (let index = 0; index < resources.faceMaterials.length; index++) {
    resources.faceMaterials[index].dispose();
    resources.textures[index].dispose();
  }
}

function createLabResources(gl, textureWidth, backdropWidth) {
  const anisotropy = Math.min(gl.capabilities.getMaxAnisotropy(), 8);
  const backdropGeometry = new THREE.PlaneGeometry(30, 20, 1, 1);
  const frameGeometry = new RoundedBoxGeometry(
    CARD_WIDTH + 0.018,
    CARD_HEIGHT + 0.018,
    0.035,
    3,
    0.016,
  );
  const faceGeometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT, 1, 1);
  const frameMaterial = new THREE.MeshPhysicalMaterial({
    color: FRAME,
    metalness: 0.52,
    roughness: 0.26,
    clearcoat: 0.32,
    clearcoatRoughness: 0.24,
    reflectivity: 0.62,
    envMapIntensity: 0.58,
  });
  let backdropTexture = null;
  let backdropMaterial = null;
  const textures = new Array(MOTION_STUDIES.length);
  const faceMaterials = new Array(MOTION_STUDIES.length);

  try {
    backdropTexture = createLabBackdropTexture(anisotropy, backdropWidth);
    backdropMaterial = new THREE.MeshBasicMaterial({
      map: backdropTexture,
      toneMapped: false,
      fog: false,
    });
    for (let index = 0; index < MOTION_STUDIES.length; index++) {
      const texture = createLabStudyTexture(
        MOTION_STUDIES[index],
        index,
        anisotropy,
        textureWidth,
      );
      textures[index] = texture;
      faceMaterials[index] = new THREE.MeshBasicMaterial({
        map: texture,
        alphaTest: 0.02,
        transparent: true,
        toneMapped: false,
      });
    }
  } catch (error) {
    backdropGeometry.dispose();
    if (backdropMaterial) backdropMaterial.dispose();
    if (backdropTexture) backdropTexture.dispose();
    frameGeometry.dispose();
    faceGeometry.dispose();
    frameMaterial.dispose();
    for (let index = 0; index < faceMaterials.length; index++) {
      if (faceMaterials[index]) faceMaterials[index].dispose();
      if (textures[index]) textures[index].dispose();
    }
    throw error;
  }

  return {
    backdropGeometry,
    backdropMaterial,
    backdropTexture,
    frameGeometry,
    faceGeometry,
    frameMaterial,
    faceMaterials,
    textures,
  };
}

function createSampleBuffers() {
  const buffers = new Array(MOTION_STUDIES.length);
  for (let index = 0; index < buffers.length; index++) {
    buffers[index] = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 0,
    };
  }
  return buffers;
}

function LabStudyCard({ study, index, register, resources }) {
  return (
    <group ref={register} userData={{ study: study.id }}>
      <mesh
        geometry={resources.frameGeometry}
        material={resources.frameMaterial}
        dispose={null}
      />
      <mesh
        geometry={resources.faceGeometry}
        material={resources.faceMaterials[index]}
        position-z={FACE_OFFSET}
        renderOrder={1}
        dispose={null}
      />
    </group>
  );
}

export default function LabCarousel({
  position = [0, 0, 0],
  textureWidth = 640,
  backdropWidth = 800,
}) {
  const stageRef = useRef(null);
  const cardRefs = useRef([]);
  const reportedReady = useRef(false);
  const readinessArmed = useRef(false);
  const renderedProgress = useRef(-1);
  const renderedLayout = useRef(null);
  const gl = useThree((state) => state.gl);
  const viewportPixelWidth = useThree((state) => state.size.width);
  const viewportPixelHeight = useThree((state) => state.size.height);
  const renderFrameAtArm = useRef(gl.info.render.frame);
  const resources = useMemo(
    () => createLabResources(gl, textureWidth, backdropWidth),
    [gl, textureWidth, backdropWidth],
  );
  const sampleBuffers = useMemo(createSampleBuffers, []);
  const layout = useMemo(
    () => createFlyingCarouselLayout({
      viewportWidth: visibleWorldWidth(viewportPixelWidth, viewportPixelHeight),
      viewportPixelWidth,
      seed: LAB_SEED,
    }),
    [viewportPixelHeight, viewportPixelWidth],
  );

  useEffect(() => () => disposeLabResources(resources), [resources]);

  useEffect(() => {
    const canvas = gl.domElement;
    const resetReadiness = () => {
      reportedReady.current = false;
      readinessArmed.current = false;
      renderFrameAtArm.current = gl.info.render.frame;
      setLabReady(false);
    };
    const onContextLost = (event) => {
      // Opt into the browser's restoration path; the SVG remains visible
      // until a fresh, visible stage frame proves the recovered context.
      event.preventDefault();
      resetReadiness();
    };
    const onContextRestored = () => {
      resetReadiness();
    };

    resetReadiness();
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);
    return () => {
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      reportedReady.current = false;
      readinessArmed.current = false;
      setLabReady(false);
    };
  }, [gl, resources]);

  useFrame(() => {
    const windowSpan = Math.max(LAB_WINDOW.end - LAB_WINDOW.start, 0.0001);
    const progress = THREE.MathUtils.clamp(
      (scrollState.progress - LAB_WINDOW.start) / windowSpan,
      0,
      1,
    );
    const renderProgress = Math.min(progress, FLIGHT_PHASES.grid);
    const layoutChanged = renderedLayout.current !== layout;
    const stageActive = labFlight.enabled && labFlight.active;

    if (stageRef.current) {
      stageRef.current.visible = stageActive;
    }
    if (!stageActive && !reportedReady.current) {
      readinessArmed.current = false;
    }

    // Off-beat cards are hidden and static. Once readiness is proven, active
    // frames also idle until scroll/layout changes; the terminal grid is held.
    if (
      !layoutChanged &&
      renderedProgress.current === progress &&
      (!stageActive || reportedReady.current)
    ) {
      return;
    }
    renderedLayout.current = layout;
    renderedProgress.current = progress;

    let readyCount = 0;
    for (let index = 0; index < layout.length; index++) {
      const node = cardRefs.current[index];
      if (!node) continue;
      readyCount += 1;

      const card = layout[index];
      const sample = sampleBuffers[index];
      sampleFlyingCard(card, renderProgress, sample);

      node.position.set(
        sample.position[0],
        sample.position[1],
        sample.position[2],
      );
      node.rotation.set(
        sample.rotation[0],
        sample.rotation[1],
        sample.rotation[2],
      );
      node.scale.setScalar(sample.scale);
    }

    // `useFrame` runs before gl.render. Arm only while the local lab stage
    // is visible, then require a later renderer frame before hiding the SVG.
    if (!reportedReady.current) {
      if (!stageActive) {
        readinessArmed.current = false;
      } else if (!readinessArmed.current && readyCount === MOTION_STUDIES.length) {
        readinessArmed.current = true;
        renderFrameAtArm.current = gl.info.render.frame;
      } else if (
        readinessArmed.current &&
        readyCount === MOTION_STUDIES.length &&
        gl.info.render.frame > renderFrameAtArm.current
      ) {
        reportedReady.current = true;
        setLabReady(true);
      }
    }
  });

  return (
    <group position={position}>
      <group ref={stageRef}>
        <mesh
          geometry={resources.backdropGeometry}
          material={resources.backdropMaterial}
          position-z={-10.5}
          renderOrder={-10}
          dispose={null}
        />
        <pointLight
          position={[3.4, 2.8, 3.6]}
          color={CWS_CYAN}
          intensity={12}
          distance={10}
          decay={2}
        />
        <pointLight
          position={[-3.2, -1.8, 2.4]}
          color={CWS_BLUE}
          intensity={9}
          distance={9}
          decay={2}
        />
        <group dispose={null}>
          {MOTION_STUDIES.map((study, index) => (
            <LabStudyCard
              key={study.id}
              study={study}
              index={index}
              register={(node) => { cardRefs.current[index] = node; }}
              resources={resources}
            />
          ))}
        </group>
      </group>
    </group>
  );
}
