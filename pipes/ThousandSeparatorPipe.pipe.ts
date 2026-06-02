import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'thousandSeparator',
  standalone: true
})
export class ThousandSeparatorPipe implements PipeTransform {
  transform(value: any, locale: string = 'en-US'): string {
    if (value === null || value === undefined || value === '') return '';
    const num = Number(value.toString().replace(/,/g, '').replace(/\D/g, ''));
    if (isNaN(num)) return '';
    return num.toLocaleString(locale);
  }
}
