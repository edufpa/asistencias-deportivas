import { cn } from "@/lib/utils";

type ClubLogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  /** Texto claro sobre fondo azul (sidebar). Falso en login/fondos claros. */
  light?: boolean;
};

const sizes = {
  sm: { w: 36, h: 42, text: "text-xs" },
  md: { w: 48, h: 56, text: "text-sm" },
  lg: { w: 72, h: 84, text: "text-base" },
};

export function ClubLogo({ size = "md", showText = true, className, light = true }: ClubLogoProps) {
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-rcl.svg"
        alt="Regatas Lima Club"
        width={s.w}
        height={s.h}
        className="object-contain shrink-0 drop-shadow-sm"
      />
      {showText && (
        <div className={cn("leading-tight min-w-0", s.text)}>
          <p className={cn("font-bold tracking-tight", light ? "text-white" : "text-primary")}>
            Regatas Lima
          </p>
          <p className={cn("font-normal text-[0.85em]", light ? "text-sky-200/90" : "text-sky-600")}>
            Asistencias
          </p>
        </div>
      )}
    </div>
  );
}
