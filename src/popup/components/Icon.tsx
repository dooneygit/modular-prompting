interface IconProps {
  name: string;
  className?: string;
  /** Material Symbols FILL axis; outline (0) vs filled (1). */
  filled?: boolean;
}

export function Icon({ name, className = "", filled = false }: IconProps) {
  return (
    <span
      className={[
        "material-symbols-outlined",
        filled && "material-symbols--filled",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {name}
    </span>
  );
}
