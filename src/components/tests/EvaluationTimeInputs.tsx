"use client";

import { Input } from "@/components/ui/input";
import type { TimePartsStrings } from "@/lib/testTimeFormat";

type Props = {
  value: TimePartsStrings;
  onChange: (next: TimePartsStrings) => void;
  disabled?: boolean;
};

export function EvaluationTimeInputs({ value, onChange, disabled }: Props) {
  return (
    <div className="flex items-center gap-0.5 shrink-0 font-mono text-sm" title="Minutos : segundos . centésimas">
      <Input
        inputMode="numeric"
        disabled={disabled}
        placeholder="0"
        value={value.min}
        onChange={(e) => onChange({ ...value, min: e.target.value.replace(/\D/g, "").slice(0, 3) })}
        className="w-10 px-1 text-center"
      />
      <span className="text-gray-500">:</span>
      <Input
        inputMode="numeric"
        disabled={disabled}
        placeholder="00"
        value={value.sec}
        onChange={(e) => onChange({ ...value, sec: e.target.value.replace(/\D/g, "").slice(0, 2) })}
        className="w-9 px-1 text-center"
      />
      <span className="text-gray-500">.</span>
      <Input
        inputMode="numeric"
        disabled={disabled}
        placeholder="00"
        value={value.cs}
        onChange={(e) => onChange({ ...value, cs: e.target.value.replace(/\D/g, "").slice(0, 2) })}
        className="w-9 px-1 text-center"
      />
    </div>
  );
}
