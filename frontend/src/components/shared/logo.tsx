export function Logo({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div className={"flex items-center gap-2 " + className}>
      <div
        className="flex items-center justify-center rounded-lg bg-primary text-white"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.70}
          height={size * 0.70}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <span
        className="font-serif leading-none text-text-primary"
        style={{ fontSize: size * 0.85 }}
      >
        Yakap
      </span>
    </div>
  );
}
