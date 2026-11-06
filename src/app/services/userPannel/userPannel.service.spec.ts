/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { UserPannelService } from './userPannel.service';

describe('Service: UserPannel', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserPannelService]
    });
  });

  it('should ...', inject([UserPannelService], (service: UserPannelService) => {
    expect(service).toBeTruthy();
  }));
});
