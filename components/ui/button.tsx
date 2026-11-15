import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
        outline:
          "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 active:scale-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
        emerald:
          "bg-emerald-600 text-white shadow-xs hover:bg-emerald-500 active:scale-[0.98]",
        ocean:
          "bg-sky-600 text-white shadow-xs hover:bg-sky-500 active:scale-[0.98]",
        amber:
          "bg-amber-500 text-black shadow-xs hover:bg-amber-400 active:scale-[0.98]",
        glass:
          "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        primary:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90 active:scale-[0.98]",
        // Dedasma style vibrant gradients & pills
        cyanGradient:
          "bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 hover:shadow-lg hover:shadow-sky-500/35 hover:scale-[1.01] active:scale-[0.98] border-0",
        tealGradient:
          "bg-gradient-to-r from-teal-400 to-cyan-500 text-white shadow-md shadow-cyan-500/25 hover:shadow-lg hover:shadow-cyan-500/35 hover:scale-[1.01] active:scale-[0.98] border-0",
        pillOutline:
          "border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full active:scale-[0.98]",
        signOut:
          "bg-rose-50 hover:bg-rose-100/80 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/40 rounded-xl font-bold text-xs active:scale-[0.98]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        pill: "h-9 rounded-full px-5 text-xs font-semibold gap-2",
        pillSm: "h-8 rounded-full px-4 text-xs font-semibold gap-1.5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
