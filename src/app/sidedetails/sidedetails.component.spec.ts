import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidedetailsComponent } from './sidedetails.component';

describe('SidedetailsComponent', () => {
  let component: SidedetailsComponent;
  let fixture: ComponentFixture<SidedetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidedetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidedetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
