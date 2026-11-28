'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Renders the tri-state horizontal dash indicator when true. */
  indeterminate?: boolean;
  /** Optional classes applied to the accessible 44px hit-target wrapper label. */
  wrapperClassName?: string;
}

/**
 * Accessible custom-styled checkbox preserving native `<input type="checkbox">`
 * semantics, keyboard navigation, indeterminate tri-state support, and a 44x44px hit target.
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, wrapperClassName, indeterminate = false, disabled, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = Boolean(indeterminate);
      }
    }, [indeterminate]);

    return (
      <label
        className={cn(
          'inline-flex items-center justify-center min-h-[44px] min-w-[44px] select-none',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          wrapperClassName
        )}
      >
        <input
          ref={innerRef}
          type="checkbox"
          disabled={disabled}
          className={cn('ledger-checkbox', className)}
          {...props}
        />
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
