import { useEffect, useState } from 'react';
import { animate } from 'framer-motion';

export function useCountUp(target: number, duration = 1.1) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [target, duration]);
  return value;
}

export function AnimatedNumber({
  value,
  format,
  duration,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const v = useCountUp(value, duration);
  const rounded = Math.round(v);
  return <>{format ? format(rounded) : rounded.toLocaleString('fr-FR')}</>;
}
