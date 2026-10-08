import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PackageCardComponent } from './package-card.component';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';

describe('PackageCardComponent', () => {
  let component: PackageCardComponent;
  let fixture: ComponentFixture<PackageCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PackageCardComponent],
      providers: [
        provideRouter([]),
        provideTransloco({
          config: {
            availableLangs: ['ar', 'en'],
            defaultLang: 'ar',
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PackageCardComponent);
    component = fixture.componentInstance;
    component.pkg = {
      _id: '1',
      name: { ar: 'باقة سنوزلين', en: 'Snoezelen Package' },
      slug: { ar: 'snoezelen', en: 'snoezelen' },
      shortDescription: { ar: 'وصف قصير', en: 'Short description' },
      price: 25000,
      tier: 'standard',
      items: [],
      images: [{ url: 'test.jpg' }],
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
