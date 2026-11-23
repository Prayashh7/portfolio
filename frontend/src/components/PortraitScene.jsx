import { Component, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion } from "../hooks/useReducedMotion.js";
import { resolveMediaUrl } from "../services/api.js";

/*
  The portrait as a point cloud.

  Two images do the work: a stylised cut-out of the photograph, and a greyscale
  depth map of the same frame. One point is placed per cell of a grid; each point
  reads its colour and its distance from the camera out of those two textures, so
  the flat picture gains real geometry that the camera and the cursor can move
  around.

  Both images come from the database (profile.image_url, profile.image_depth_url).
  Replacing them in the dashboard changes the scene — there is nothing about this
  person compiled into the component.
*/

const PORTRAIT_ASPECT = 0.6975;
const PLANE_HEIGHT = 3.2;
const ASSEMBLE_SECONDS = 1.9;

const vertexShader = /* glsl */ `
  uniform sampler2D uColor;
  uniform sampler2D uDepth;
  uniform float uTime;
  uniform float uProgress;
  uniform float uAmplitude;
  uniform float uSize;
  uniform vec2 uPointer;

  varying vec2 vUv;
  varying float vDepth;
  varying float vAlpha;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vUv = uv;

    float mask = texture2D(uColor, uv).a;
    float depth = texture2D(uDepth, uv).r;

    vDepth = depth;
    vAlpha = smoothstep(0.10, 0.55, mask);

    // Outside the subject there is nothing to draw. Sending the point beyond clip
    // space is the cheapest way to drop it.
    if (vAlpha < 0.002) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      return;
    }

    vec3 pos = position;
    pos.z += (depth - 0.35) * uAmplitude;

    // Before the scene settles the points are scattered dust; uProgress draws them in.
    float scatter = 1.0 - uProgress;
    pos.z += scatter * (hash(uv) * 7.0 - 2.0);
    pos.xy *= mix(1.14, 1.0, uProgress);

    // Nearer points travel further with the cursor, which is what reads as depth.
    pos.xy += uPointer * (0.05 + depth * 0.20);
    pos.z += sin(uTime * 0.45 + pos.y * 1.8) * 0.022 * uProgress;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = uSize * (0.55 + depth * 0.95) * (2.6 / -mvPosition.z);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uColor;
  uniform vec3 uShadow;
  uniform vec3 uHighlight;
  uniform vec3 uAccent;
  uniform float uProgress;

  varying vec2 vUv;
  varying float vDepth;
  varying float vAlpha;

  void main() {
    // Round points, not squares.
    vec2 offset = gl_PointCoord - 0.5;
    float distanceSquared = dot(offset, offset);
    if (distanceSquared > 0.25) discard;
    float edge = smoothstep(0.25, 0.02, distanceSquared);

    vec3 texel = pow(texture2D(uColor, vUv).rgb, vec3(2.2));
    float luminance = dot(texel, vec3(0.2126, 0.7152, 0.0722));

    // A duotone rather than the photograph: the palette stays in charge, and a
    // trace of the original colour keeps it from looking like a filter.
    vec3 duotone = mix(uShadow, uHighlight, smoothstep(0.04, 0.82, luminance));
    vec3 color = mix(duotone, texel, 0.16);
    color += uAccent * pow(vDepth, 3.0) * 0.22;

    gl_FragColor = vec4(color, edge * vAlpha * uProgress * (0.42 + vDepth * 0.58));
  }
`;

function PointCloud({ colorUrl, depthUrl, pointer, accent }) {
  const [colorMap, depthMap] = useLoader(THREE.TextureLoader, [colorUrl, depthUrl]);
  const group = useRef(null);
  const progress = useRef(0);
  const { size, viewport } = useThree();

  const [columns, rows] = useMemo(() => {
    const dense = window.innerWidth >= 768;
    return dense ? [160, 229] : [104, 149];
  }, []);

  useEffect(() => {
    for (const map of [colorMap, depthMap]) {
      map.minFilter = THREE.LinearFilter;
      map.magFilter = THREE.LinearFilter;
      map.generateMipmaps = false;
    }
    // The portrait carries colour; the depth map carries data and must not be
    // colour-managed on the way in.
    colorMap.colorSpace = THREE.SRGBColorSpace;
    depthMap.colorSpace = THREE.NoColorSpace;
    colorMap.needsUpdate = true;
    depthMap.needsUpdate = true;
  }, [colorMap, depthMap]);

  const geometry = useMemo(() => {
    const width = PLANE_HEIGHT * PORTRAIT_ASPECT;
    const count = columns * rows;
    const positions = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);

    let index = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const u = column / (columns - 1);
        const v = row / (rows - 1);
        positions[index * 3] = (u - 0.5) * width;
        positions[index * 3 + 1] = (v - 0.5) * PLANE_HEIGHT;
        positions[index * 3 + 2] = 0;
        uvs[index * 2] = u;
        uvs[index * 2 + 1] = v;
        index += 1;
      }
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    buffer.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    return buffer;
  }, [columns, rows]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        uniforms: {
          uColor: { value: colorMap },
          uDepth: { value: depthMap },
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uAmplitude: { value: 0.85 },
          uSize: { value: 6 },
          uPointer: { value: new THREE.Vector2() },
          uShadow: { value: new THREE.Color("#101a2b") },
          uHighlight: { value: new THREE.Color("#dff2f7") },
          uAccent: { value: new THREE.Color(accent) },
        },
      }),
    [colorMap, depthMap, accent]
  );

  /* Point size is in device pixels, so it has to follow both the canvas height
     and the pixel ratio to keep the same apparent density everywhere. */
  useEffect(() => {
    const base = Math.min(4.6, Math.max(2.2, size.height / 220));
    material.uniforms.uSize.value = base * viewport.dpr;
  }, [material, size.height, viewport.dpr]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    const step = Math.min(delta, 0.05);
    const uniforms = material.uniforms;

    uniforms.uTime.value += step;

    if (progress.current < 1) {
      progress.current = Math.min(1, progress.current + step / ASSEMBLE_SECONDS);
      const eased = 1 - Math.pow(1 - progress.current, 3);
      uniforms.uProgress.value = eased;
    }

    const p = pointer.current;
    const ease = Math.min(1, step * 3.2);
    p.x += (p.targetX - p.x) * ease;
    p.y += (p.targetY - p.y) * ease;

    uniforms.uPointer.value.set(p.x * 0.16, -p.y * 0.16);

    if (group.current) {
      group.current.rotation.y = p.x * 0.17;
      group.current.rotation.x = -p.y * 0.1;
    }
  });

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} />
    </group>
  );
}

/* If WebGL fails for any reason the portrait itself is still the point of the
   section, so the stylised image takes over rather than leaving a hole. */
class SceneBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn("[portrait] falling back to the still image", error);
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function StillPortrait({ src, alt }) {
  return <img className="portrait__still" src={src} alt={alt} width="837" height="1200" />;
}

export default function PortraitScene({ profile, accent = "#22d3ee", pointer, active = true }) {
  const reduced = useReducedMotion();
  const [supportsWebGL] = useState(() => {
    try {
      const probe = document.createElement("canvas");
      return Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
    } catch {
      return false;
    }
  });

  const colorUrl = resolveMediaUrl(profile?.image_url);
  const depthUrl = resolveMediaUrl(profile?.image_depth_url);
  const alt = profile?.name ? `${profile.name}, rendered as a point cloud` : "Portrait";
  const still = <StillPortrait src={colorUrl} alt={alt} />;

  if (!colorUrl) return null;
  if (!depthUrl || reduced || !supportsWebGL) return still;

  return (
    <SceneBoundary fallback={still}>
      <Canvas
        className="portrait__canvas"
        dpr={[1, 2]}
        frameloop={active ? "always" : "never"}
        camera={{ position: [0, 0, 4.4], fov: 32, near: 0.1, far: 24 }}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        aria-label={alt}
        role="img"
      >
        <Suspense fallback={null}>
          <PointCloud
            colorUrl={colorUrl}
            depthUrl={depthUrl}
            pointer={pointer}
            accent={accent}
          />
        </Suspense>
      </Canvas>
    </SceneBoundary>
  );
}
