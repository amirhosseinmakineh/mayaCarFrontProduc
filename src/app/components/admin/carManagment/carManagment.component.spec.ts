import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { AdminService, AdminCarPage } from '../../../services/admin/admin.service';
import { CarManagmentComponent } from './carManagment.component';

describe('CarManagmentComponent car edits', () => {
  const page: AdminCarPage = {
    items: [{
      id: 42,
      name: 'Test car',
      carModelId: 61,
      tipId: 72,
      companyId: 83,
      model: 'Model',
      tip: 'Shared trim name',
      company: 'Company',
      imageName: '/images/cars/current.jpg',
      description: '',
      startDate: '',
      marketPrice: 100,
      factoryPrice: 0,
    }],
    filteredCount: 1,
    pageNumber: 0,
    pageSize: 10,
  };

  let component: CarManagmentComponent;
  let admin: jasmine.SpyObj<AdminService>;
  let toastr: jasmine.SpyObj<ToastrService>;

  beforeEach(() => {
    admin = jasmine.createSpyObj<AdminService>('AdminService', ['getCars', 'updateCar', 'updateVehicleImage']);
    admin.getCars.and.returnValue(of(page));
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    TestBed.configureTestingModule({
      imports: [CarManagmentComponent],
      providers: [
        { provide: AdminService, useValue: admin },
        { provide: ToastrService, useValue: toastr },
      ],
    });
    component = TestBed.createComponent(CarManagmentComponent).componentInstance;
    component.loadCars();
    component.tips.set([{ id: 19, name: 'Shared trim name' }, { id: 72, name: 'Shared trim name' }]);
    component.openEdit(component.cars()[0]);
  });

  it('sends the image and stored catalog IDs together, even before the lookup lists load', async () => {
    admin.updateCar.and.returnValue(of({ isSuccess: true, isFailure: false, message: '', data: null }));
    component.selectedFile = new File(['image contents'], 'car.jpg', { type: 'image/jpeg' });

    await component.saveCar();

    expect(admin.updateCar).toHaveBeenCalledTimes(1);
    const body = admin.updateCar.calls.mostRecent().args[0] as FormData;
    expect(body.get('Id')).toBe('42');
    expect(body.get('CarModelId')).toBe('61');
    expect(body.get('TipId')).toBe('72');
    expect(body.get('CompanyId')).toBe('83');
    expect((body.get('Image') as File).name).toBe('car.jpg');
    expect(body.has('ImageName')).toBeFalse();
    expect(admin.updateVehicleImage).not.toHaveBeenCalled();
    expect(admin.getCars).toHaveBeenCalledTimes(2);
  });

  it('reduces large camera images before the same car update request', async () => {
    admin.updateCar.and.returnValue(of({ isSuccess: true, isFailure: false, message: '', data: null }));
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1000;
    const context = canvas.getContext('2d')!;
    const pixels = context.createImageData(canvas.width, canvas.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      pixels.data[index] = Math.random() * 255;
      pixels.data[index + 1] = Math.random() * 255;
      pixels.data[index + 2] = Math.random() * 255;
      pixels.data[index + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    const png = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    expect(png!.size).toBeGreaterThan(512 * 1024);
    component.selectedFile = new File([png!], 'camera.png', { type: 'image/png' });

    await component.saveCar();

    const body = admin.updateCar.calls.mostRecent().args[0] as FormData;
    const image = body.get('Image') as File;
    expect(image.name).toBe('camera.jpg');
    expect(image.type).toBe('image/jpeg');
    expect(image.size).toBeLessThan(png!.size);
    expect(body.get('Id')).toBe('42');
  });

  it('keeps the edit open and shows the proxy request ID on failure', () => {
    admin.updateCar.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 504,
      headers: new HttpHeaders({ 'X-Request-Id': 'test-request-id' }),
      error: { code: 'API_PROXY_TIMEOUT' },
    })));

    component.saveCar();

    expect(component.activeModal()).toBe('edit');
    expect(component.saving).toBeFalse();
    expect(toastr.success).not.toHaveBeenCalled();
    expect(toastr.error).toHaveBeenCalledWith(jasmine.stringMatching(/test-request-id/));
    const body = admin.updateCar.calls.mostRecent().args[0] as FormData;
    expect(body.has('Image')).toBeFalse();
    expect(body.has('ImageName')).toBeFalse();
  });
});
