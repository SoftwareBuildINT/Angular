import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveviewComponent } from './liveview.component';

describe('LiveviewComponent', () => {
  let component: LiveviewComponent;
  let fixture: ComponentFixture<LiveviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
