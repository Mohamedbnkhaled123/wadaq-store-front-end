import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductCardComponent } from './product-card.component';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';

describe('ProductCardComponent', () => {
  let component: ProductCardComponent;
  let fixture: ComponentFixture<ProductCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCardComponent],
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

    fixture = TestBed.createComponent(ProductCardComponent);
    component = fixture.componentInstance;
    component.product = {
      _id: '1',
      name: { ar: 'أرجوحة حسية', en: 'Sensory Swing' },
      slug: { ar: 'sensory-swing', en: 'sensory-swing' },
      description: { ar: 'وصف', en: 'Description' },
      shortDescription: { ar: 'وصف قصير', en: 'Short description' },
      price: 1500,
      images: [{ url: 'test.jpg' }],
      category: 'swings',
      inStock: true,
      isActive: true,
      isDeleted: false,
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
