import React from 'react';
import { Popover as RadixPopover } from 'radix-ui';
import { cn } from '../../lib/utils';

const Popover = RadixPopover.Root;
const PopoverTrigger = RadixPopover.Trigger;
const PopoverAnchor = RadixPopover.Anchor;

const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof RadixPopover.Content>,
  React.ComponentPropsWithoutRef<typeof RadixPopover.Content> & {
    container?: HTMLElement;
  }
>(({ className, align = 'start', sideOffset = 4, container, children, ...props }, ref) => (
  <RadixPopover.Portal container={container}>
    <RadixPopover.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl',
        'outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
        'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
        className
      )}
      {...props}
    >
      {children}
    </RadixPopover.Content>
  </RadixPopover.Portal>
));
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
