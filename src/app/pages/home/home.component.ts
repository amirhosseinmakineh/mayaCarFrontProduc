import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InstallmentService } from '../../services/instalMent/installMent.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth/auth-service';
import { MobileNavComponent } from "../../components/helpers/buttonNavigation/mobileNavComponent/mobileNavComponent.component";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MobileNavComponent]
})
export class HomeComponent implements OnInit {

  private readonly router = inject(Router);
  private readonly service = inject(InstallmentService);
  private readonly authService = inject(AuthService);

  constructor() { }

  ngOnInit(): void {
  }
  goToCarList() {
    this.router.navigate(['/carList']);
  }

}
