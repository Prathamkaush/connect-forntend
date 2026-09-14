type Variant = "cards" | "plans" | "guide" | "hero" | "settings" | "rows";

export function UserSkeleton({ variant = "rows", count = 3, label = "Loading content" }: { variant?: Variant; count?: number; label?: string }) {
  const block = (className: string) => <span className={`user-shimmer ${className}`} />;
  return <div className={`user-skeleton skeleton-${variant}`} role="status" aria-label={label} aria-busy="true">
    <span className="skeleton-sr-only">{label}</span>
    <div className="skeleton-content" aria-hidden="true">
      {Array.from({ length: variant === "hero" || variant === "guide" ? 1 : count }, (_, index) => <div className="skeleton-item" key={index}>
        {(variant === "cards" || variant === "hero") && block("skeleton-avatar")}
        <div className="skeleton-copy">{block("skeleton-line skeleton-short")}{block("skeleton-line skeleton-title")}{block("skeleton-line")}{block("skeleton-line skeleton-medium")}
          {(variant === "plans" || variant === "guide") && <>{block("skeleton-line")}{block("skeleton-line")}{block("skeleton-line skeleton-medium")}</>}
        </div>
        {(variant === "cards" || variant === "plans" || variant === "settings") && block("skeleton-button")}
      </div>)}
    </div>
  </div>;
}
