import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { InstallmentService } from '../../services/instalMent/installMent.service';
import { NumberFormatDirective } from '../../../directives/number-format.directive';

@Component({
  selector: 'app-installment',
  standalone: true,
  imports: [CommonModule, FormsModule, NumberFormatDirective],
  templateUrl: './installment.component.html',
  styleUrls: ['./installment.component.css']
})
export class InstallmentComponent {
  private readonly service = inject(InstallmentService);
  private readonly cdr = inject(ChangeDetectorRef);

  public dto = {
    carPrice: '',
    prePayment: '',
    time: ''
  };

  public finalPrice: number | null = null;

  calculate(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    const carPrice = this.toNumber(this.dto.carPrice);
    const prePayment = this.toNumber(this.dto.prePayment);
    const time = this.toNumber(this.dto.time);

    this.service.calculate(carPrice, prePayment, time).subscribe({
      next: (res) => {
        this.finalPrice = Number(res);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  private toNumber(value: string | number | null | undefined): number {
    return Number(
      String(value ?? '')
        .replace(/,/g, '')
        .replace(/\s/g, '')
        .trim()
    );
  }
}
