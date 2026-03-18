import { Group, Panel, Separator } from "react-resizable-panels"
import { cn } from "@renderer/lib/utils"

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof Group>) => (
  <Group
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) => (
  <Separator
    className={cn(
      "relative flex w-px items-center justify-center bg-border transition-all duration-150",
      "hover:w-[3px] hover:bg-foreground/10",
      "data-[resize-handle-active]:w-[3px] data-[resize-handle-active]:bg-foreground/20",
      "after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex flex-col gap-[3px] opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:!opacity-100 [[data-resize-handle-active]_&]:!opacity-100">
        <span className="block w-[3px] h-[3px] rounded-full bg-muted-foreground/40" />
        <span className="block w-[3px] h-[3px] rounded-full bg-muted-foreground/40" />
        <span className="block w-[3px] h-[3px] rounded-full bg-muted-foreground/40" />
      </div>
    )}
  </Separator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
