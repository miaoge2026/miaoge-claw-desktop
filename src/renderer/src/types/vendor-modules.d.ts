declare module 'cmdk' {
  import * as React from 'react'

  type PrimitiveComponent = React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement>>
  type InputComponent = React.ForwardRefExoticComponent<React.InputHTMLAttributes<HTMLInputElement> & React.RefAttributes<HTMLInputElement>>

  export const Command: PrimitiveComponent & {
    Input: InputComponent
    List: PrimitiveComponent
    Empty: PrimitiveComponent
    Group: PrimitiveComponent
    Separator: PrimitiveComponent
    Item: PrimitiveComponent
  }
}

declare module 'react-resizable-panels' {
  import * as React from 'react'

  export type GroupProps = React.HTMLAttributes<HTMLDivElement> & { direction?: 'horizontal' | 'vertical' }
  export type PanelProps = React.HTMLAttributes<HTMLDivElement> & { defaultSize?: number; minSize?: number }
  export type SeparatorProps = React.HTMLAttributes<HTMLDivElement>

  export const Group: React.FC<GroupProps>
  export const Panel: React.FC<PanelProps>
  export const Separator: React.FC<SeparatorProps>
}
