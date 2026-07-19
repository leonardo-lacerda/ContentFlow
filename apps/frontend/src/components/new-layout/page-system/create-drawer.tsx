'use client';

import { ReactNode, useCallback } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';

export type OpenCreateDrawerParams = {
  title: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Default 560 */
  size?: number | string;
  maxSize?: number | string;
  height?: number | string;
  fullScreen?: boolean;
  closeOnClickOutside?: boolean;
  onClose?: () => void;
  id?: string;
};

/**
 * Thin helper over useModals with defaults suited for "create/generate" drawers.
 */
export function useCreateDrawer() {
  const modals = useModals();

  const openCreateDrawer = useCallback(
    (params: OpenCreateDrawerParams) => {
      modals.openModal({
        title: params.title,
        children: params.children,
        size: params.size ?? 560,
        maxSize: params.maxSize,
        height: params.height,
        fullScreen: params.fullScreen,
        closeOnClickOutside: params.closeOnClickOutside ?? false,
        withCloseButton: true,
        onClose: params.onClose,
        id: params.id,
        classNames: {
          modal: 'bg-newBgColorInner',
        },
      });
    },
    [modals]
  );

  return {
    openCreateDrawer,
    closeAll: modals.closeAll,
    closeCurrent: modals.closeCurrent,
    closeById: modals.closeById,
  };
}
