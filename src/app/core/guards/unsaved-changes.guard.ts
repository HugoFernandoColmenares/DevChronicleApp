import { CanDeactivateFn } from '@angular/router';

export interface UnsavedChangesAware {
  hasUnsavedChanges(): boolean;
  confirmDiscard(): Promise<boolean>;
}

/**
 * Functional counterpart to `CanDeactivate` that keeps the editor lazy-loaded. The component owns
 * the dirty check; this guard only asks the author and returns the decision.
 */
export const unsavedChangesGuard: CanDeactivateFn<UnsavedChangesAware> = (component) => {
  if (!component?.hasUnsavedChanges()) {
    return true;
  }
  return component.confirmDiscard();
};
