/* tslint:disable:no-unused-variable */

import { TestBed, waitForAsync, inject } from '@angular/core/testing';
import { InstallmentService } from './installMent.service';

describe('Service: InstallMent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InstallmentService]
    });
  });

  it('should ...', inject([InstallmentService], (service: InstallmentService) => {
    expect(service).toBeTruthy();
  }));
});
