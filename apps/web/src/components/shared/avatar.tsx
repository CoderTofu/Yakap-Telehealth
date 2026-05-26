import { initials } from "@/lib/appConfig";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  color?: string;
  size?: number;
  className?: string;
}

export function YakapAvatar({
  name,
  color = "#0B4F71",
  size = 40,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white",
        className,
      )}
      style={{
        backgroundColor: color,
        width: size,
        height: size,
        fontSize: size * 0.4,
      }}
      aria-label={name}
    >
      {initials(name)}
    </div>
  );
}
