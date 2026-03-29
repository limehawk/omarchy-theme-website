const steps = [
  {
    number: "1",
    title: "browse",
    description: "Find a theme you love in the gallery",
  },
  {
    number: "2",
    title: "copy",
    description: "One command to install it",
    command: "omarchy-theme-install <url>.git",
  },
  {
    number: "3",
    title: "done",
    description: "Theme applied on next restart",
  },
];

export function HowItWorks() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {steps.map((step) => (
        <div
          key={step.number}
          className="border border-border/40 rounded-lg p-6 space-y-3"
        >
          <span className="font-mono text-2xl font-bold text-foreground/20">
            {step.number}
          </span>
          <h3 className="font-mono text-sm font-medium text-foreground">
            {step.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>
          {step.command && (
            <code className="block font-mono text-xs text-muted-foreground bg-black/30 rounded px-3 py-2 mt-2">
              $ {step.command}
            </code>
          )}
        </div>
      ))}
    </div>
  );
}
