import { TestBed } from '@angular/core/testing';
import { GuildAuthGuard } from './guild-auth.guard';
import { AppModule } from '../app.module';

describe('GuildAuthGuard', () => {
  let guard: GuildAuthGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppModule]
    });
    guard = TestBed.inject(GuildAuthGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
