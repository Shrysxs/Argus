import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

const alertVariants = cva("relative w-full rounded-md border px-4 py-3 text-sm [&_strong]:font-semibold", {
  variants: {
    variant: {
      default: "border-border bg-surface text-foreground",
      info: "border-info/30 bg-info/10 text-info",
      warning: "border-warning/30 bg-warning/10 text-warning",
      destructive: "border-destructive/30 bg-destructive/10 text-destructive",
      success: "border-success/30 bg-success/10 text-success",
    },
  },
  defaultVariants: { variant: "default" },
})

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div role="alert" data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="alert-title" className={cn("font-medium", className)} {...props} />
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("mt-0.5 text-xs opacity-90", className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription }
