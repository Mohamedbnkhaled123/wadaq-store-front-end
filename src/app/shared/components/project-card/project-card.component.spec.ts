import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectCardComponent } from './project-card.component';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';

describe('ProjectCardComponent', () => {
  let component: ProjectCardComponent;
  let fixture: ComponentFixture<ProjectCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectCardComponent],
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

    fixture = TestBed.createComponent(ProjectCardComponent);
    component = fixture.componentInstance;
    component.project = {
      _id: '1',
      title: { ar: 'مشروع مركز الأمل', en: 'Al Amal Center' },
      slug: { ar: 'al-amal', en: 'al-amal' },
      description: { ar: 'تجهيز كامل', en: 'Full fitting' },
      images: [{ url: 'test.jpg' }],
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
