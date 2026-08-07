/**
 * Punto de importación único de los primitivos de UI.
 *
 * Permite `import { Button, Card } from '@/components/ui'` en vez de tres
 * líneas de import por archivo. Se irá ampliando: Sheet/Modal/Toast en la
 * Fase 6, TextField/AmountField/Select en la 7, Color/IconPicker en la 11.
 */

export { Button } from './Button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button';

export { IconButton } from './IconButton';
export type { IconButtonProps, IconButtonSize, IconButtonVariant } from './IconButton';

export { Card } from './Card';
export type { CardPadding, CardProps, CardVariant } from './Card';

export { Icon } from './Icon';
export type { IconProps, IconSize } from './Icon';

export { Skeleton } from './Skeleton';
export type { SkeletonProps, SkeletonVariant } from './Skeleton';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

// Overlays (Fase 6). `Overlay` NO se exporta a propósito: es la base interna
// de los tres siguientes y nadie debe usarla directamente.
export { Sheet } from './Sheet';
export type { SheetProps } from './Sheet';

export { Modal } from './Modal';
export type { ModalProps } from './Modal';

export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog';

export { ToastHost } from './ToastHost';

// Campos de formulario (Fase 7).
export { TextField } from './TextField';
export type { TextFieldProps } from './TextField';

export { AmountField } from './AmountField';
export type { AmountFieldProps } from './AmountField';

export { Select } from './Select';
export type { SelectOption, SelectProps } from './Select';

// Selectores de apariencia (Fase 11).
export { ColorPicker } from './ColorPicker';
export type { ColorPickerProps } from './ColorPicker';

export { IconPicker } from './IconPicker';
export type { IconPickerProps } from './IconPicker';
