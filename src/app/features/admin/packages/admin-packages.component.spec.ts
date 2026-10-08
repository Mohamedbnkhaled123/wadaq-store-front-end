import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { AdminPackagesComponent } from './admin-packages.component';

describe('AdminPackagesComponent', () => {
  let component: AdminPackagesComponent;
  let fixture: ComponentFixture<AdminPackagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPackagesComponent],
      providers: [
        provideHttpClient()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPackagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
