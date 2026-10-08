import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PackageDetailComponent } from './package-detail.component';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';

describe('PackageDetailComponent', () => {
  let component: PackageDetailComponent;
  let fixture: ComponentFixture<PackageDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PackageDetailComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        provideTransloco({
          config: {
            availableLangs: ['ar', 'en'],
            defaultLang: 'ar',
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PackageDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
