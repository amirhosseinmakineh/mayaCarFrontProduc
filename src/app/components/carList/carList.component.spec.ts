import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { CarService } from '../../services/car/car.service';
import { CarListComponent } from './carList.component';

describe('CarListComponent vehicle images', () => {
  const photoPath = '/images/cars/car-1.jpg';
  let photo: HTMLImageElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CarListComponent],
      providers: [
        provideRouter([]),
        {
          provide: CarService,
          useValue: {
            getAllCarsWithFilter: () => of({ items: [{ id: 1, name: 'پژو ۲۰۷', imageName: photoPath }] }),
            getAllCompanies: () => of([]),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(CarListComponent);
    fixture.detectChanges();
    photo = fixture.nativeElement.querySelector('.card-image img');
  });

  it('starts loading the card image without waiting for the viewport', () => {
    expect(photo.getAttribute('src')).toBe('https://api.mayakhodro.com' + photoPath);
    expect(photo.getAttribute('loading')).not.toBe('lazy');
  });

  it('tries the site origin and then the local placeholder if the photo fails', () => {
    photo.dispatchEvent(new Event('error'));
    expect(photo.getAttribute('src')).toBe(photoPath);

    photo.dispatchEvent(new Event('error'));
    expect(photo.getAttribute('src')).toBe('/assets/images/car-placeholder.svg');

    photo.dispatchEvent(new Event('error'));
    expect(photo.getAttribute('src')).toBe('/assets/images/car-placeholder.svg');
  });
});
