'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { pulse } from '../../lib/pulse';
import { scrollState } from '../../lib/scrollState';
import { RENDER_QUALITY } from '../../lib/renderQuality.mjs';

const baseScale = new THREE.Vector3(1, 1, 1);
const tmpScale = new THREE.Vector3();
const BLUE_HIGHLIGHT = '#9deaff';
const BLUE_GLOW = '#147dff';

const vertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vLocalPosition;
  varying float vDisplacement;

  uniform float uTime;
  uniform float uPulse;
  uniform float uScrollVelocity;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(
      dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)
    ));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(
      dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)
    ), 0.0);
    m *= m;
    return 42.0 * dot(m * m, vec4(
      dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)
    ));
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * snoise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vLocalPosition = position;

    vec3 p = position * 1.12;
    float time = uTime * 0.22;
    float broadWarp = fbm(p + vec3(time, -time, time * 0.5));
    float fineWarp = snoise(p * 2.1 + vec3(-time * 0.8, time, time * 0.2));
    float ridge = max(0.0, 1.0 - abs(snoise(p * 1.45)));
    float displacement = broadWarp * 0.16 + fineWarp * 0.06 + ridge * 0.12;
    displacement += uPulse * 0.07;

    vec3 displaced = position + normal * displacement;
    vDisplacement = displacement;

    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(normalMatrix * normal);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vLocalPosition;
  varying float vDisplacement;

  uniform float uTime;
  uniform float uPulse;
  uniform float uScrollProgress;
  uniform vec2 uMouse;
  uniform vec3 uBlueHighlight;
  uniform vec3 uBlueGlow;

  float saturate(float value) { return clamp(value, 0.0, 1.0); }

  vec3 F_Schlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
  }

  float D_GGX(float NdotH, float roughness) {
    float alpha = roughness * roughness;
    float alphaSquared = alpha * alpha;
    float denominator = (NdotH * NdotH) * (alphaSquared - 1.0) + 1.0;
    return alphaSquared / (3.14159 * denominator * denominator);
  }

  float G_SchlickGGX(float NdotV, float roughness) {
    float k = pow(roughness + 1.0, 2.0) / 8.0;
    return NdotV / (NdotV * (1.0 - k) + k);
  }

  float G_Smith(float NdotV, float NdotL, float roughness) {
    return G_SchlickGGX(NdotV, roughness) * G_SchlickGGX(NdotL, roughness);
  }

  vec3 envGradient(vec3 direction) {
    float height = direction.y * 0.5 + 0.5;
    vec3 zenith = vec3(0.015, 0.11, 0.34);
    vec3 horizon = vec3(0.015, 0.035, 0.11);
    vec3 ground = vec3(0.003, 0.008, 0.025);
    vec3 sky = mix(horizon, zenith, height);
    return mix(ground, sky, saturate(height * 1.25));
  }

  void main() {
    vec3 N = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
    vec3 V = normalize(cameraPosition - vWorldPosition);

    float time = uTime * 0.55;
    vec3 lightPositionA = vec3(5.0 * sin(time * 0.75), 3.5, 6.0 * cos(time * 0.75));
    vec3 lightPositionB = vec3(-4.0 * cos(time * 0.5), -2.0, 5.0 * sin(time * 0.4));
    vec3 lightPositionC = vec3(2.0, 5.0 * sin(time * 0.3), -5.0);

    vec3 L1 = normalize(lightPositionA - vWorldPosition);
    vec3 L2 = normalize(lightPositionB - vWorldPosition);
    vec3 L3 = normalize(lightPositionC - vWorldPosition);

    float verticalGradient = saturate(0.5 + vLocalPosition.y * 0.34);
    float facetVariation = 0.5 + 0.5 * sin(vLocalPosition.x * 7.0 + vLocalPosition.z * 5.0);
    vec3 deepBlue = vec3(0.008, 0.045, 0.17);
    vec3 crystalBlue = vec3(0.025, 0.18, 0.52);
    vec3 baseAlbedo = mix(deepBlue, crystalBlue, verticalGradient * 0.72);
    baseAlbedo += uBlueGlow * (0.08 + facetVariation * 0.08);

    float roughness = clamp(0.1 + abs(vDisplacement) * 0.42, 0.08, 0.34);
    float metallic = 0.42;
    vec3 F0 = mix(vec3(0.04), baseAlbedo, metallic);

    float NdotV = saturate(dot(N, V));
    vec3 direct = vec3(0.0);
    vec3 lightColorA = vec3(0.45, 0.82, 1.0);
    vec3 lightColorB = vec3(0.06, 0.3, 1.0);
    vec3 lightColorC = vec3(0.22, 0.42, 1.0);

    vec3 lights[3];
    vec3 lightColors[3];
    lights[0] = L1;
    lights[1] = L2;
    lights[2] = L3;
    lightColors[0] = lightColorA;
    lightColors[1] = lightColorB;
    lightColors[2] = lightColorC;

    for (int i = 0; i < 3; i++) {
      vec3 H = normalize(V + lights[i]);
      float NdotL = saturate(dot(N, lights[i]));
      float NdotH = saturate(dot(N, H));
      vec3 F = F_Schlick(saturate(dot(V, H)), F0);
      float distribution = D_GGX(NdotH, roughness);
      float geometry = G_Smith(NdotV, NdotL, roughness);
      vec3 specular = (distribution * geometry * F)
        / max(4.0 * NdotV * NdotL, 0.001);
      vec3 diffuse = baseAlbedo * 0.08 / 3.14159;
      direct += (diffuse + specular) * lightColors[i] * NdotL;
    }

    vec3 reflected = reflect(-V, N);
    vec3 environment = envGradient(reflected);
    vec3 environmentSpecular = F_Schlick(NdotV, F0) * environment * (1.0 - roughness) * 1.2;

    vec3 mouseDirection = normalize(vec3((uMouse.x - 0.5) * 2.0, (uMouse.y - 0.5) * 2.0, 1.0));
    float blueSheen = pow(saturate(dot(N, normalize(mouseDirection + V))), 16.0);
    vec3 sheen = uBlueHighlight * blueSheen * 1.5;

    float rim = pow(1.0 - NdotV, 2.8);
    vec3 rimLight = mix(uBlueGlow, uBlueHighlight, 0.35) * rim * (0.7 + uPulse * 2.8);
    vec3 pulseGlow = uBlueHighlight * uPulse * 0.85;
    vec3 facetGlow = uBlueGlow * abs(vDisplacement) * 0.5;

    vec3 color = direct + environmentSpecular + sheen + rimLight + pulseGlow + facetGlow;
    color += vec3(0.01, 0.025, 0.08) * (1.0 - verticalGradient);
    color = clamp(color, 0.0, 4.0);

    float alpha = 0.94 - uScrollProgress * 0.08;
    gl_FragColor = vec4(color, alpha);
  }
`;

const mobileVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vLocalPosition;
  varying float vDisplacement;

  uniform float uTime;
  uniform float uPulse;

  void main() {
    vLocalPosition = position;
    float wave = sin(position.y * 3.2 + uTime * 0.45) * 0.035;
    float pulseLift = uPulse * 0.035;
    vec3 displaced = position + normal * (wave + pulseLift);
    vDisplacement = wave + pulseLift;
    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const mobileFragmentShader = /* glsl */ `
  precision highp float;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vLocalPosition;
  varying float vDisplacement;

  uniform float uTime;
  uniform float uPulse;
  uniform float uScrollProgress;
  uniform vec2 uMouse;
  uniform vec3 uBlueHighlight;
  uniform vec3 uBlueGlow;

  float saturate(float value) { return clamp(value, 0.0, 1.0); }

  void main() {
    vec3 N = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 L = normalize(vec3(3.5, 4.0, 5.0) - vWorldPosition);
    vec3 H = normalize(V + L);

    float NdotV = saturate(dot(N, V));
    float NdotL = saturate(dot(N, L));
    float facet = 0.5 + 0.5 * sin(vLocalPosition.x * 6.0 + vLocalPosition.z * 4.0);
    float verticalGradient = saturate(0.5 + vLocalPosition.y * 0.34);
    vec3 baseAlbedo = mix(vec3(0.008, 0.045, 0.17), vec3(0.025, 0.18, 0.52), verticalGradient * 0.72);
    baseAlbedo += uBlueGlow * (0.07 + facet * 0.07);

    float highlight = pow(saturate(dot(N, H)), 18.0) * NdotL;
    float sheen = pow(saturate(dot(N, normalize(vec3((uMouse.x - 0.5) * 2.0, (uMouse.y - 0.5) * 2.0, 1.0)))), 12.0);
    float rim = pow(1.0 - NdotV, 2.5);

    vec3 color = baseAlbedo * (0.14 + NdotL * 0.35);
    color += uBlueHighlight * (highlight * 1.35 + sheen * 0.65);
    color += mix(uBlueGlow, uBlueHighlight, 0.35) * rim * (0.55 + uPulse * 2.0);
    color += uBlueHighlight * uPulse * 0.55;
    color += abs(vDisplacement) * uBlueGlow * 0.4;
    color = clamp(color, 0.0, 3.0);

    gl_FragColor = vec4(color, 0.94 - uScrollProgress * 0.08);
  }
`;

// The hero mascot: a faceted, self-lit blue crystal that pulses when clicked.
export default function Crystal({ position = [0, 0, 0], quality = RENDER_QUALITY.balanced }) {
  const outer = useRef();
  const core = useRef();
  const lastPulse = useRef(0);
  const energy = useRef(0);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;

    if (pulse.t !== lastPulse.current) {
      lastPulse.current = pulse.t;
      energy.current = 1;
    }

    energy.current *= Math.exp(-dt * 2.2);
    const pulseEnergy = energy.current;
    const isAnimating = quality.animate || pulseEnergy > 0.01;

    if (!isAnimating) return;

    if (outer.current) {
      outer.current.rotation.y += dt * (0.22 + pulseEnergy * 4.0 + Math.abs(scrollState.velocity) * 0.0008);
      outer.current.rotation.x = Math.sin(time * 0.3) * 0.12 + pulseEnergy * 0.34;

      const scale = 1 + Math.sin(time * 1.15) * 0.018 + pulseEnergy * 0.2;
      tmpScale.copy(baseScale).multiplyScalar(scale);
      outer.current.scale.copy(tmpScale);

      const { uniforms } = outer.current.material;
      uniforms.uTime.value = time;
      uniforms.uPulse.value = pulseEnergy;
      uniforms.uScrollProgress.value = scrollState.progress;
      uniforms.uScrollVelocity.value = scrollState.velocity;
      uniforms.uMouse.value.set(pulse.x, 1 - pulse.y);
    }

    if (core.current) {
      core.current.rotation.y -= dt * 0.55;
      core.current.material.emissiveIntensity = 0.7 + Math.sin(time * 2.0) * 0.2 + pulseEnergy * 5.0;
      core.current.scale.setScalar(0.34 * (1 + pulseEnergy * 0.5));
    }
  });

  return (
    <Float
      speed={quality.animate ? 1.35 : 0}
      rotationIntensity={quality.animate ? 0.16 : 0}
      floatIntensity={quality.animate ? 0.55 : 0}
      position={position}
    >
      <mesh ref={outer} key={quality.tier}>
        <icosahedronGeometry args={[1.4, quality.tier === 'high' ? 3 : quality.tier === 'balanced' ? 2 : 1]} />
        <shaderMaterial
          vertexShader={quality.tier === 'high' ? vertexShader : mobileVertexShader}
          fragmentShader={quality.tier === 'high' ? fragmentShader : mobileFragmentShader}
          uniforms={{
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uScrollProgress: { value: 0 },
            uScrollVelocity: { value: 0 },
            uMouse: { value: new THREE.Vector2(0.5, 0.5) },
            uBlueHighlight: { value: new THREE.Color(BLUE_HIGHLIGHT) },
            uBlueGlow: { value: new THREE.Color(BLUE_GLOW) },
          }}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={core} scale={0.34}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={BLUE_HIGHLIGHT}
          emissive={BLUE_GLOW}
          emissiveIntensity={0.7}
          metalness={quality.tier === 'high' ? 0.15 : 0.05}
          roughness={0.16}
          toneMapped={false}
        />
      </mesh>
    </Float>
  );
}
