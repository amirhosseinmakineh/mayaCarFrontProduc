/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { UserPannelComponent } from './userPannel.component';

describe('UserPannelComponent', () => {
  let component: UserPannelComponent;
  let fixture: ComponentFixture<UserPannelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UserPannelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserPannelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
