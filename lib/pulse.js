// Hero "blast" singleton. DOM click handlers write; 3D reads in useFrame.
// Consumers compare pulse.t against the last timestamp they acted on.
export const pulse = { t: 0, x: 0, y: 0 };

export function blast(x = 0.5, y = 0.5) {
  pulse.t = typeof performance !== 'undefined' ? performance.now() : Date.now();
  pulse.x = x;
  pulse.y = y;
}
