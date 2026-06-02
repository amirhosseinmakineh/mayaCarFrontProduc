import { Injectable, TemplateRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';


export interface ModalData {
  title?: string;
  content?: string | TemplateRef<any> | null;
  size?: 'sm' | 'md' | 'lg';
  // آرایه دکمه‌ها برای Footer
  buttons?: Array<{
    text: string;
    action: () => void;
    style?: 'primary' | 'secondary'; // اختیاری برای تم دکمه
  }>;
}
@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalSubject = new BehaviorSubject<ModalData | null>(null);
  modal$ = this.modalSubject.asObservable();

  // باز کردن مودال
  open(data: ModalData) {
    this.modalSubject.next(data);
  }

  // بستن مودال
  close() {
    this.modalSubject.next(null);
  }
}
