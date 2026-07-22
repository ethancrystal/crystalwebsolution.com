'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { CLUSTERS } from '../../lib/journey';

// All lighting is generated — no HDRI downloads.
export default function Lights() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight position={[4, 4, 4]} intensity={40} color="#8fd8ff" />
      <pointLight position={[-5, -2, CLUSTERS.services]} intensity={30} color="#3c6cff" />
      <pointLight position={[2, 1.5, CLUSTERS.approach]} intensity={26} color="#3c6cff" />
      <pointLight position={[0, 3, CLUSTERS.mark]} intensity={35} color="#c084fc" />
      <pointLight position={[0, 0, CLUSTERS.contact + 4]} intensity={35} color="#59f3ff" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.4} color="#59f3ff" position={[0, 3, -2]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#3c6cff" position={[-4, -1, 2]} rotation-y={Math.PI / 3} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#c084fc" position={[4, 0, 1]} rotation-y={-Math.PI / 3} scale={[5, 2, 1]} />
      </Environment>
    </>
  );
}
