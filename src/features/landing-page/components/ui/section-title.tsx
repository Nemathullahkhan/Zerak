export function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-3">
      {eyebrow ? (
        <div className="text-[10px] font-semibold tracking-widest text-neutral-500 uppercase">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="font-heading text-2xl sm:text-3xl text-white font-semibold tracking-tight leading-tight">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}



