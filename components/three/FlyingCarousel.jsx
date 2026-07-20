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
import {
  motionFlight,
  setMotionReady,
} from '../../lib/motionFlight.mjs';
import { MOTION_STUDIES } from '../../lib/motionStudies.mjs';

const CWS_CYAN = '#59f3ff';
const CWS_BLUE = '#3c6cff';
const FRAME = '#ccd2d8';
const FACE_OFFSET = 0.0185;

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

function createBackdropTexture(anisotropy, textureWidth) {
  const canvas = document.createElement('canvas');
  canvas.width = textureWidth;
  canvas.height = Math.round(textureWidth * (2 / 3));

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    throw new Error('FlyingCarousel could not create its procedural backdrop.');
  }

  const width = canvas.width;
  const height = canvas.height;
  context.fillStyle = '#d9dde2';
  context.fillRect(0, 0, width, height);

  context.save();
  context.strokeStyle = 'rgba(35, 43, 54, 0.075)';
  context.lineWidth = 2;
  for (let index = 0; index < 6; index++) {
    const y = height * (0.1 + index * 0.15);
    context.beginPath();
    context.moveTo(-width * 0.08, y);
    context.bezierCurveTo(
      width * 0.24,
      y - height * (0.14 + index * 0.006),
      width * 0.7,
      y + height * (0.1 - index * 0.004),
      width * 1.08,
      y - height * 0.06,
    );
    context.stroke();
  }
  context.restore();

  const glyphX = width * 0.16;
  const glyphY = height * 0.2;
  context.save();
  context.strokeStyle = 'rgba(35, 43, 54, 0.095)';
  context.lineWidth = 2;
  for (let ring = 1; ring <= 3; ring++) {
    context.beginPath();
    context.arc(glyphX, glyphY, ring * 18, 0, Math.PI * 2);
    context.stroke();
  }
  context.strokeStyle = 'rgba(35, 43, 54, 0.08)';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(glyphX, glyphY, 54, -0.7, 0.4);
  context.stroke();
  context.fillStyle = 'rgba(35, 43, 54, 0.14)';
  context.beginPath();
  context.arc(glyphX, glyphY, 4, 0, Math.PI * 2);
  context.fill();
  context.restore();

  return createCanvasTexture(canvas, anisotropy);
}

function createStudyTexture(study, index, anisotropy, textureWidth) {
  const canvas = document.createElement('canvas');
  const textureHeight = Math.round(textureWidth * (CARD_HEIGHT / CARD_WIDTH));
  canvas.width = textureWidth;
  canvas.height = textureHeight;

  const context = canvas.getContext('2d', { alpha: true });
  if (!context) {
    throw new Error('FlyingCarousel could not create a procedural card texture.');
  }

  const width = textureWidth;
  const height = textureHeight;
  const number = String(index + 1).padStart(2, '0');
  const inset = Math.max(5, height * 0.01);
  const radius = height * 0.06;
  const left = width * 0.055;
  const right = width * 0.945;

  context.clearRect(0, 0, width, height);
  context.save();
  roundedRectPath(
    context,
    inset,
    inset,
    width - inset * 2,
    height - inset * 2,
    radius,
  );
  context.clip();

  context.fillStyle = '#f4f3ef';
  context.fillRect(0, 0, width, height);

  const colorField = context.createLinearGradient(0, 0, width, height * 0.72);
  colorField.addColorStop(0, study.color);
  colorField.addColorStop(0.62, study.color);
  colorField.addColorStop(1, '#edf0f2');
  context.save();
  context.globalAlpha = 0.94;
  context.fillStyle = colorField;
  context.fillRect(0, 0, width, height * 0.72);
  context.restore();

  context.save();
  context.globalAlpha = 0.28;
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.moveTo(width * 0.62, 0);
  context.lineTo(width, 0);
  context.lineTo(width, height * 0.55);
  context.lineTo(width * 0.82, height * 0.43);
  context.closePath();
  context.fill();
  context.restore();

  context.save();
  context.globalAlpha = 0.1;
  context.strokeStyle = '#111820';
  context.lineWidth = 1;
  for (let x = width * 0.06; x < width; x += width * 0.075) {
    context.beginPath();
    context.moveTo(x, height * 0.08);
    context.lineTo(x, height * 0.7);
    context.stroke();
  }
  for (let y = height * 0.1; y < height * 0.72; y += height * 0.095) {
    context.beginPath();
    context.moveTo(width * 0.035, y);
    context.lineTo(width * 0.965, y);
    context.stroke();
  }
  context.restore();

  context.save();
  context.translate(width * 0.5, height * (0.42 + index * 0.008));
  context.rotate(-0.24 + index * 0.018);
  context.globalAlpha = 0.92;
  context.strokeStyle = '#141a21';
  context.lineCap = 'round';
  context.lineWidth = height * 0.052;
  context.beginPath();
  context.moveTo(-width * 0.58, height * (0.08 - index * 0.006));
  context.bezierCurveTo(
    -width * 0.28,
    height * (-0.24 + index * 0.018),
    width * 0.14,
    height * (0.25 - index * 0.014),
    width * 0.59,
    height * (-0.11 + index * 0.009),
  );
  context.stroke();
  context.globalAlpha = 0.85;
  context.strokeStyle = index % 2 === 0 ? CWS_BLUE : CWS_CYAN;
  context.lineWidth = height * 0.009;
  context.beginPath();
  context.moveTo(-width * 0.59, height * 0.14);
  context.bezierCurveTo(
    -width * 0.24,
    -height * 0.12,
    width * 0.14,
    height * 0.18,
    width * 0.6,
    -height * 0.16,
  );
  context.stroke();
  context.restore();

  const accentX = width * (0.14 + index * 0.105);
  const accentY = height * (0.27 + (index % 2) * 0.17);
  context.fillStyle = '#f4f3ef';
  context.beginPath();
  context.arc(accentX, accentY, height * (0.045 + index * 0.004), 0, Math.PI * 2);
  context.fill();
  context.lineWidth = height * 0.01;
  context.strokeStyle = '#141a21';
  context.stroke();
  context.fillStyle = index % 2 === 0 ? CWS_CYAN : CWS_BLUE;
  context.beginPath();
  context.arc(accentX, accentY, height * 0.014, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.globalAlpha = 0.14;
  context.font = `700 ${Math.round(height * 0.46)}px Arial, sans-serif`;
  context.textAlign = 'right';
  context.textBaseline = 'alphabetic';
  context.strokeStyle = '#111820';
  context.lineWidth = height * 0.006;
  context.strokeText(number, right, height * 0.68);
  context.restore();

  const footerFade = context.createLinearGradient(0, height * 0.57, 0, height);
  footerFade.addColorStop(0, 'rgba(244, 243, 239, 0)');
  footerFade.addColorStop(0.28, 'rgba(244, 243, 239, 0.94)');
  footerFade.addColorStop(1, '#f4f3ef');
  context.fillStyle = footerFade;
  context.fillRect(0, height * 0.57, width, height * 0.43);

  const topRule = context.createLinearGradient(left, 0, right, 0);
  topRule.addColorStop(0, CWS_CYAN);
  topRule.addColorStop(0.58, CWS_BLUE);
  topRule.addColorStop(1, study.color);
  context.fillStyle = topRule;
  context.fillRect(left, height * 0.04, right - left, Math.max(4, height * 0.01));

  context.textBaseline = 'middle';
  context.fillStyle = '#202832';
  context.font = `700 ${Math.round(height * 0.034)}px "Space Mono", Consolas, monospace`;
  context.textAlign = 'left';
  context.fillText('CWS / MOTION STUDY', left, height * 0.095);
  context.textAlign = 'right';
  context.fillStyle = CWS_BLUE;
  context.font = `700 ${Math.round(height * 0.056)}px "Space Mono", Consolas, monospace`;
  context.fillText(number, right, height * 0.095);

  context.textAlign = 'left';
  context.fillStyle = '#111820';
  context.font = `700 ${Math.round(height * 0.096)}px "Space Grotesk", Arial, sans-serif`;
  context.fillText(study.title, left, height * 0.79, width * 0.79);
  context.fillStyle = '#3e4650';
  context.font = `500 ${Math.round(height * 0.054)}px Inter, Arial, sans-serif`;
  context.fillText(study.subtitle, left, height * 0.89, width * 0.64);

  context.fillStyle = study.color;
  context.beginPath();
  context.arc(right - height * 0.025, height * 0.89, height * 0.024, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#111820';
  context.lineWidth = Math.max(2, height * 0.004);
  context.beginPath();
  context.arc(right - height * 0.025, height * 0.89, height * 0.038, 0, Math.PI * 2);
  context.stroke();

  context.restore();

  roundedRectPath(
    context,
    inset,
    inset,
    width - inset * 2,
    height - inset * 2,
    radius,
  );
  context.lineWidth = Math.max(3, height * 0.006);
  context.strokeStyle = '#aeb4bb';
  context.stroke();

  roundedRectPath(
    context,
    inset + 5,
    inset + 5,
    width - (inset + 5) * 2,
    height - (inset + 5) * 2,
    radius - 5,
  );
  context.lineWidth = Math.max(1, height * 0.003);
  context.strokeStyle = '#ffffff';
  context.globalAlpha = 0.72;
  context.stroke();
  context.globalAlpha = 1;

  return createCanvasTexture(canvas, anisotropy);
}

function disposeCarouselResources(resources) {
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

function createCarouselResources(gl, textureWidth, backdropWidth) {
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
    metalness: 0.48,
    roughness: 0.34,
    clearcoat: 0.24,
    clearcoatRoughness: 0.32,
    reflectivity: 0.5,
    envMapIntensity: 0.46,
  });
  let backdropTexture = null;
  let backdropMaterial = null;
  const textures = new Array(MOTION_STUDIES.length);
  const faceMaterials = new Array(MOTION_STUDIES.length);

  try {
    backdropTexture = createBackdropTexture(anisotropy, backdropWidth);
    backdropMaterial = new THREE.MeshBasicMaterial({
      map: backdropTexture,
      toneMapped: false,
      fog: false,
    });
    for (let index = 0; index < MOTION_STUDIES.length; index++) {
      const texture = createStudyTexture(
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

function StudyCard({ study, index, register, resources }) {
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

// Six deterministic cards consume Motion.jsx's shared scroll state. Each card
// is two draw calls (chrome body + textured face), replacing the former stack
// of individual artwork meshes without adding another animation clock.
export default function FlyingCarousel({
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
  const viewport = useThree((state) => state.viewport);
  const renderFrameAtArm = useRef(gl.info.render.frame);
  const resources = useMemo(
    () => createCarouselResources(gl, textureWidth, backdropWidth),
    [gl, textureWidth, backdropWidth],
  );
  const sampleBuffers = useMemo(createSampleBuffers, []);
  const layout = useMemo(
    () => createFlyingCarouselLayout({ viewportWidth: viewport.width }),
    [viewport.width],
  );

  useEffect(() => () => disposeCarouselResources(resources), [resources]);

  useEffect(() => {
    const canvas = gl.domElement;
    const resetReadiness = () => {
      reportedReady.current = false;
      readinessArmed.current = false;
      renderFrameAtArm.current = gl.info.render.frame;
      setMotionReady(false);
    };
    const onContextLost = (event) => {
      // Opt into the browser's restoration path; the SVG remains visible
      // until a fresh, visible carousel frame proves the recovered context.
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
      setMotionReady(false);
    };
  }, [gl, resources]);

  useFrame(() => {
    const progress = THREE.MathUtils.clamp(motionFlight.progress, 0, 1);
    const renderProgress = Math.min(progress, FLIGHT_PHASES.grid);
    const layoutChanged = renderedLayout.current !== layout;
    const carouselActive = motionFlight.enabled && motionFlight.active;

    if (stageRef.current) {
      stageRef.current.visible = carouselActive;
    }
    if (!carouselActive && !reportedReady.current) {
      readinessArmed.current = false;
    }

    // Off-beat cards are hidden and static. Once readiness is proven, active
    // frames also idle until scroll/layout changes; the terminal grid is held.
    if (
      !layoutChanged &&
      renderedProgress.current === renderProgress &&
      (!carouselActive || reportedReady.current)
    ) {
      return;
    }
    renderedLayout.current = layout;
    renderedProgress.current = renderProgress;

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

    // `useFrame` runs before gl.render. Arm only while the local carousel stage
    // is visible, then require a later renderer frame before hiding the SVG.
    if (!reportedReady.current) {
      if (!carouselActive) {
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
        setMotionReady(true);
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
          intensity={14}
          distance={10}
          decay={2}
        />
        <pointLight
          position={[-3.2, -1.8, 2.4]}
          color={CWS_BLUE}
          intensity={10}
          distance={9}
          decay={2}
        />
        <group dispose={null}>
          {MOTION_STUDIES.map((study, index) => (
            <StudyCard
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
