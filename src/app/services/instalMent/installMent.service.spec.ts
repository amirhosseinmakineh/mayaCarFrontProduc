/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { InstallMentService } from './installMent.service';

describe('Service: InstallMent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InstallMentService]
    });
  });

  it('should ...', inject([InstallMentService], (service: InstallMentService) => {
    expect(service).toBeTruthy();
  }));
});
