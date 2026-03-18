import { cn } from '../../lib/utils';

export const Slider = ({ value, min = 0, max = 100, step = 1, onChange, className }: { value: number, min?: number, max?: number, step?: number, onChange: (val: number) => void, className?: string }) => (
  <input
    type="range"
    min={min}
    max={max}
    step={step}
    value={value}
    onChange={(e) => onChange(parseFloat(e.target.value))}
    className={cn("w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary", className)}
  />
);
