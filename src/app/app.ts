import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {ToastrService} from 'ngx-toastr'
import { HeaderComponent } from './components/header/header.component';
import { MobileNavComponent } from "./components/helpers/buttonNavigation/mobileNavComponent/mobileNavComponent.component";
import { FooterComponent } from "./components/footer/footer.component";
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, MobileNavComponent, FooterComponent,FormsModule,CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('mayacarFront');
  isSupportMenuOpen = false;

toggleSupportMenu(): void {
  this.isSupportMenuOpen = !this.isSupportMenuOpen;
}
}
