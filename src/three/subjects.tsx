import React from "react";
import * as THREE from "three";

export type SubjectKind =
  | "whale" // long marine animal (blue whale, sperm whale, shark-like)
  | "sperm-whale"
  | "bus"
  | "tower" // skyscraper / monument / tree: tall thing, size = height
  | "sphere" // planet, moon, ball: size = diameter
  | "elephant" // size = shoulder height
  | "shark"; // size = length

const Mat: React.FC<{ color: string; rough?: number }> = ({ color, rough = 0.55 }) => (
  <meshStandardMaterial color={color} roughness={rough} flatShading />
);

// Smooth whale body from a lathe profile (radius along the length).
const whaleProfile = (sperm: boolean) => {
  const pts: THREE.Vector2[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const u = i / N; // 0 = nose, 1 = tail
    let r: number;
    if (sperm) {
      // blunt, tall head then long taper
      r = u < 0.04 ? 0.6 + u * 10 : u < 0.35 ? 1 : Math.max(1 - Math.pow((u - 0.35) / 0.65, 1.4), 0.04);
    } else {
      r = Math.sin(Math.min(u / 0.3, 1) * Math.PI / 2) * (u < 0.3 ? 1 : Math.max(1 - Math.pow((u - 0.3) / 0.7, 1.6), 0.04));
    }
    pts.push(new THREE.Vector2(Math.max(r, 0.001), u));
  }
  return pts;
};

const Whale: React.FC<{ size: number; color: string; frame: number; sperm?: boolean }> = ({
  size,
  color,
  frame,
  sperm = false,
}) => {
  const L = size;
  const R = L * (sperm ? 0.1 : 0.075);
  const swim = Math.sin(frame / 12);
  const bob = Math.sin(frame / 20) * L * 0.01;
  const profile = React.useMemo(() => whaleProfile(sperm), [sperm]);
  return (
    <group position={[0, R * 1.3 + bob, 0]} rotation={[0, 0, swim * 0.015]}>
      {/* body: lathe along local Y, rotated to lie along X (nose at -X) */}
      <mesh castShadow rotation={[0, 0, -Math.PI / 2]} position={[-L / 2, 0, 0]} scale={[R, L, R * 0.9]}>
        <latheGeometry args={[profile, 48]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.05} />
      </mesh>
      {/* lighter belly */}
      <mesh rotation={[0, 0, -Math.PI / 2]} position={[-L / 2 + L * 0.02, -R * 0.18, 0]} scale={[R * 0.93, L * 0.7, R * 0.85]}>
        <latheGeometry args={[profile, 48, Math.PI * 0.75, Math.PI * 0.5]} />
        <meshStandardMaterial color="#c9d6df" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* flukes */}
      <group position={[L * 0.47, 0, 0]} rotation={[0, 0, swim * 0.25]}>
        {[-1, 1].map((sd) => (
          <mesh key={sd} castShadow position={[L * 0.03, 0, sd * L * 0.06]} rotation={[0, sd * 0.55, 0]} scale={[L * 0.05, L * 0.007, L * 0.075]}>
            <sphereGeometry args={[1, 24, 12]} />
            <meshStandardMaterial color={color} roughness={0.45} />
          </mesh>
        ))}
      </group>
      {/* pectoral fins */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} castShadow position={[-L * 0.2, -R * 0.55, sd * R * 0.85]} rotation={[sd * 0.5, sd * 0.5, -0.35]} scale={[L * (sperm ? 0.05 : 0.09), L * 0.006, L * 0.022]}>
          <sphereGeometry args={[1, 16, 8]} />
          <meshStandardMaterial color={color} roughness={0.45} />
        </mesh>
      ))}
      {/* eyes */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[-L * (sperm ? 0.36 : 0.4), -R * 0.25, sd * R * 0.82]}>
          <sphereGeometry args={[L * 0.006, 12, 12]} />
          <meshStandardMaterial color="#0b0b0b" roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
};

const Bus: React.FC<{ size: number; color: string }> = ({ size, color }) => {
  const k = size / 12;
  return (
    <group scale={k}>
      <mesh castShadow position={[0, 1.9, 0]}>
        <boxGeometry args={[12, 2.9, 2.55]} />
        <Mat color={color} rough={0.35} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 2.3, s * 1.28]}>
          <boxGeometry args={[11, 1.1, 0.02]} />
          <meshStandardMaterial color="#1b2733" metalness={0.6} roughness={0.15} />
        </mesh>
      ))}
      {[-4, 4].flatMap((x) =>
        [-1, 1].map((s) => (
          <mesh key={`${x}${s}`} position={[x, 0.5, s * 1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.35, 20]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        )),
      )}
    </group>
  );
};

const Tower: React.FC<{ size: number; color: string }> = ({ size, color }) => {
  const w = Math.max(size * 0.12, 4);
  return (
    <group>
      <mesh castShadow position={[0, size * 0.45, 0]}>
        <boxGeometry args={[w, size * 0.9, w]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.25} />
      </mesh>
      <mesh castShadow position={[0, size * 0.95, 0]}>
        <coneGeometry args={[w * 0.3, size * 0.1, 4]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.25} />
      </mesh>
    </group>
  );
};

const Planet: React.FC<{ size: number; color: string; frame: number }> = ({
  size,
  color,
  frame,
}) => (
  <mesh castShadow position={[0, size / 2, 0]} rotation={[0.3, frame * 0.01, 0]}>
    <icosahedronGeometry args={[size / 2, 5]} />
    <Mat color={color} rough={0.8} />
  </mesh>
);

const Elephant: React.FC<{ size: number; color: string; frame: number }> = ({ size, color, frame }) => {
  // proportions of an African bush elephant, normalised to shoulder height 1
  const k = size;
  const sway = Math.sin(frame / 18) * 0.06;
  const skin = <meshStandardMaterial color={color} roughness={0.85} />;
  return (
    <group scale={k}>
      {/* body */}
      <mesh castShadow position={[0, 0.72, 0]} scale={[0.62, 0.36, 0.34]}>
        <sphereGeometry args={[1, 32, 24]} />
        {skin}
      </mesh>
      {/* legs */}
      {[[-0.38, -0.17], [-0.38, 0.17], [0.36, -0.17], [0.36, 0.17]].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, 0.27, z]}>
          <cylinderGeometry args={[0.1, 0.11, 0.56, 16]} />
          {skin}
        </mesh>
      ))}
      {/* head */}
      <mesh castShadow position={[-0.66, 0.92, 0]} scale={[0.24, 0.26, 0.22]}>
        <sphereGeometry args={[1, 28, 20]} />
        {skin}
      </mesh>
      {/* ears */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} castShadow position={[-0.55, 0.9, sd * 0.24]} rotation={[0, sd * 0.35, 0]} scale={[0.2, 0.28, 0.02]}>
          <sphereGeometry args={[1, 24, 16]} />
          {skin}
        </mesh>
      ))}
      {/* trunk: tapered segments curving down */}
      <group position={[-0.84, 0.86, 0]} rotation={[0, 0, sway]}>
        {Array.from({ length: 7 }).map((_, i) => (
          <mesh key={i} castShadow position={[-0.03 * i, -0.08 * i, 0]} rotation={[0, 0, -0.25 - i * 0.04]}>
            <cylinderGeometry args={[0.07 - i * 0.006, 0.075 - i * 0.006, 0.1, 14]} />
            {skin}
          </mesh>
        ))}
      </group>
      {/* tusks */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[-0.83, 0.74, sd * 0.09]} rotation={[0, 0, 1.9]}>
          <coneGeometry args={[0.025, 0.24, 12]} />
          <meshStandardMaterial color="#f1ead6" roughness={0.4} />
        </mesh>
      ))}
      {/* eyes */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[-0.8, 0.99, sd * 0.13]}>
          <sphereGeometry args={[0.015, 10, 10]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
      {/* tail */}
      <mesh position={[0.64, 0.68, 0]} rotation={[0, 0, -0.35 + sway]}>
        <cylinderGeometry args={[0.012, 0.012, 0.32, 8]} />
        {skin}
      </mesh>
    </group>
  );
};

const sharkProfile = () => {
  const pts: THREE.Vector2[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const u = i / N; // 0 = snout, 1 = tail
    const r = u < 0.32 ? Math.sin((u / 0.32) * Math.PI / 2) ** 0.8 : Math.max(1 - Math.pow((u - 0.32) / 0.68, 1.3), 0.03);
    pts.push(new THREE.Vector2(Math.max(r, 0.001), u));
  }
  return pts;
};

const Fin: React.FC<{ w: number; h: number; t: number; color: string; pos: [number, number, number]; rot: [number, number, number] }> = ({ w, h, t, color, pos, rot }) => {
  const shape = React.useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.quadraticCurveTo(w * 0.35, h * 0.6, w * 0.75, h);
    sh.quadraticCurveTo(w * 0.8, h * 0.4, w, 0);
    sh.lineTo(0, 0);
    return sh;
  }, [w, h]);
  return (
    <mesh castShadow position={pos} rotation={rot}>
      <extrudeGeometry args={[shape, { depth: t, bevelEnabled: true, bevelSize: t * 0.4, bevelThickness: t * 0.4, bevelSegments: 2 }]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
};

const Shark: React.FC<{ size: number; color: string; frame: number }> = ({ size, color, frame }) => {
  const L = size;
  const R = L * 0.085;
  const swim = Math.sin(frame / 9);
  const profile = React.useMemo(() => sharkProfile(), []);
  return (
    <group position={[0, R * 1.6, 0]} rotation={[0, swim * 0.03, 0]}>
      <mesh castShadow rotation={[0, 0, -Math.PI / 2]} position={[-L / 2, 0, 0]} scale={[R, L, R * 0.85]}>
        <latheGeometry args={[profile, 48]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
      {/* white belly */}
      <mesh rotation={[0, 0, -Math.PI / 2]} position={[-L / 2 + L * 0.01, -R * 0.15, 0]} scale={[R * 0.95, L * 0.8, R * 0.82]}>
        <latheGeometry args={[profile, 48, Math.PI * 0.7, Math.PI * 0.6]} />
        <meshStandardMaterial color="#e8edf0" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* dorsal fin */}
      <Fin w={L * 0.13} h={L * 0.12} t={L * 0.006} color={color} pos={[-L * 0.12, R * 0.8, -L * 0.003]} rot={[0, 0, 0]} />
      {/* tail: upper and lower lobes */}
      <group position={[L * 0.47, 0, 0]} rotation={[0, swim * 0.3, 0]}>
        <Fin w={L * 0.1} h={L * 0.16} t={L * 0.005} color={color} pos={[-L * 0.04, 0, -L * 0.0025]} rot={[0, 0, -0.5]} />
        <Fin w={L * 0.07} h={L * 0.09} t={L * 0.005} color={color} pos={[-L * 0.03, 0, -L * 0.0025]} rot={[Math.PI, 0, 0.6]} />
      </group>
      {/* pectoral fins */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} castShadow position={[-L * 0.17, -R * 0.55, sd * R * 0.9]} rotation={[sd * 0.6, sd * 0.4, -0.5]} scale={[L * 0.08, L * 0.006, L * 0.035]}>
          <sphereGeometry args={[1, 16, 8]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      ))}
      {/* eyes */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[-L * 0.4, R * 0.15, sd * R * 0.6]}>
          <sphereGeometry args={[L * 0.005, 10, 10]} />
          <meshStandardMaterial color="#050505" roughness={0.1} />
        </mesh>
      ))}
      {/* gill slits */}
      {[0, 1, 2, 3, 4].map((g) => [-1, 1].map((sd) => (
        <mesh key={`${g}${sd}`} position={[-L * (0.3 - g * 0.018), -R * 0.05, sd * R * 0.8]} rotation={[0, 0, 0.15]}>
          <boxGeometry args={[L * 0.003, R * 0.6, L * 0.002]} />
          <meshStandardMaterial color="#2a3238" />
        </mesh>
      )))}
    </group>
  );
};

export const Subject: React.FC<{
  kind: SubjectKind;
  size: number;
  color?: string;
  frame: number;
}> = ({ kind, size, color, frame }) => {
  switch (kind) {
    case "whale":
      return <Whale size={size} color={color ?? "#4f6f8f"} frame={frame} />;
    case "sperm-whale":
      return <Whale size={size} color={color ?? "#5a5f66"} frame={frame} sperm />;
    case "bus":
      return <Bus size={size} color={color ?? "#ff4d6d"} />;
    case "tower":
      return <Tower size={size} color={color ?? "#9fb3c8"} />;
    case "elephant":
      return <Elephant size={size} color={color ?? "#8a8580"} frame={frame} />;
    case "shark":
      return <Shark size={size} color={color ?? "#6b7a86"} frame={frame} />;
    case "sphere":
      return <Planet size={size} color={color ?? "#3ddcff"} frame={frame} />;
  }
};
