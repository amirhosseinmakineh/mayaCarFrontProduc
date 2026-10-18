/* tslint:disable:no-unused-variable */
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { MobileNavComponent } from './mobileNavComponent.component';

describe('MobileNavComponent', () => {
  let component: MobileNavComponent;
  let fixture: ComponentFixture<MobileNavComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ MobileNavComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MobileNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
