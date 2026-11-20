import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertResult } from 'sweetalert2';

const dialog = Swal.mixin({
  customClass: {
    popup: 'dc-swal',
    title: 'dc-swal__title',
    htmlContainer: 'dc-swal__text',
    confirmButton: 'dc-swal__confirm',
    cancelButton: 'dc-swal__cancel',
    actions: 'dc-swal__actions',
  },
  buttonsStyling: false,
  background: '#f7f8f3',
  color: '#14201a',
  showClass: { popup: 'swal2-show' },
  hideClass: { popup: 'swal2-hide' },
});

const toast = Swal.mixin({
  toast: true,
  position: 'bottom-end',
  showConfirmButton: false,
  timer: 2400,
  timerProgressBar: true,
  customClass: {
    popup: 'dc-swal dc-swal--toast',
    title: 'dc-swal__title',
    timerProgressBar: 'dc-swal__timer',
  },
  buttonsStyling: false,
  background: '#162032',
  color: '#f7faf6',
});

@Injectable({ providedIn: 'root' })
export class NotificationService {
  success(title: string, text?: string): Promise<SweetAlertResult> {
    return this.alert('success', title, text);
  }

  error(title: string, text?: string): Promise<SweetAlertResult> {
    return this.alert('error', title, text);
  }

  info(title: string, text?: string): Promise<SweetAlertResult> {
    return this.alert('info', title, text);
  }

  toast(title: string, icon: SweetAlertIcon = 'success'): Promise<SweetAlertResult> {
    return toast.fire({ icon, title, showConfirmButton: false });
  }

  confirm(title: string, text?: string): Promise<boolean> {
    return dialog
      .fire({
        icon: undefined,
        title,
        text,
        showCancelButton: true,
        focusCancel: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        returnFocus: true,
      })
      .then((result) => result.isConfirmed);
  }

  private alert(icon: SweetAlertIcon, title: string, text?: string): Promise<SweetAlertResult> {
    return dialog.fire({
      icon: undefined,
      title,
      text,
      confirmButtonText: 'Cerrar',
      returnFocus: true,
      // Keep semantic role for screen readers without the generic glyph.
      customClass: {
        popup: `dc-swal dc-swal--${icon}`,
        title: 'dc-swal__title',
        htmlContainer: 'dc-swal__text',
        confirmButton: 'dc-swal__confirm',
        cancelButton: 'dc-swal__cancel',
        actions: 'dc-swal__actions',
      },
    });
  }
}
