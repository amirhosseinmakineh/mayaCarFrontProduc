import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[numberFormat]',
  standalone: true
})
export class NumberFormatDirective {

  private regex = new RegExp(/^\d+$/);

  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event'])
  onInput(event: any) {

    let value = event.target.value;

    // حذف هر چیز غیر عدد
    value = value.replace(/,/g, '').replace(/\D/g, '');

    if (value && this.regex.test(value)) {
      // تبدیل به عدد با سه رقم جداکننده
      const formatted = Number(value).toLocaleString('en-US');
      this.el.nativeElement.value = formatted;
    } else {
      this.el.nativeElement.value = '';
    }
  }

  @HostListener('blur', ['$event'])
  onBlur(event: any) {
    let value = event.target.value.replace(/,/g, '');
    if (value) {
      event.target.value = Number(value).toLocaleString('en-US');
    }
  }
}
