import { Component, TemplateRef } from '@angular/core';
import { ModalService, ModalData } from '../../../services/helpers/modal-service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ModalComponent {
  modal$: Observable<ModalData | null>;

  constructor(private modalService: ModalService) {
    this.modal$ = this.modalService.modal$;
  }

  close() {
    this.modalService.close();
  }

  isTemplateRef(content: any): content is TemplateRef<any> {
    return content instanceof TemplateRef;
  }
}
