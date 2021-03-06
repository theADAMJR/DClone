import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { UsernameValidators } from 'src/app/pages/auth/sign-up/username.validators';
import { SaveChangesComponent } from 'src/app/pages/channels/components/save-changes/save-changes.component';
import { DevelopersService } from 'src/app/services/api/developers.service';
import { SoundService } from 'src/app/services/sound.service';
import { WSService } from 'src/app/services/ws.service';
import { Lean, patterns } from 'src/app/types/entity-types';

@Component({
  selector: 'app-bot-user',
  templateUrl: './bot-user.component.html',
  styleUrls: ['../app/application.component.css', '../developers.component.css']
})
export class BotUserComponent implements OnInit {
  public form = new FormGroup({
    avatarURL: new FormControl('', [ Validators.required ]),
    username: new FormControl('', [
      Validators.required,
      Validators.pattern(patterns.username),
    ], [ this.usernameValidators.shouldBeUnique.bind(this.usernameValidators) ]),
  });

  public originalForm: Lean.App;
  public app: Lean.App;

  private saveChanges$: Subscription;  
  private valueChanges$: Subscription;
  
  constructor(
    private route: ActivatedRoute,
    public saveChanges: MatSnackBar,
    public service: DevelopersService,
    private sounds: SoundService,
    private ws: WSService,
    private usernameValidators: UsernameValidators,
  ) {}

  public async ngOnInit() {
    const appId = this.route.snapshot.paramMap.get('id');

    this.app = await this.service.getAsync(appId);
    this.form.setValue({
      avatarURL: this.app.user.avatarURL,
      username: this.app.user.username,
    });
    this.originalForm = { ...this.form.value };

    this.valueChanges$ = this.form.valueChanges
      .subscribe(() => this.openSaveChanges()); 
  }

  public ngOnDestroy() {    
    this.valueChanges$?.unsubscribe();
    this.saveChanges$?.unsubscribe();
  }
  
  public openSaveChanges() {
    const snackBarRef = this.saveChanges._openedSnackBarRef;    
    if (this.form.invalid || snackBarRef) return;

    this.saveChanges$ = this.saveChanges
      .openFromComponent(SaveChangesComponent)
      .afterOpened()
      .subscribe(() => {
        const component = this.saveChanges._openedSnackBarRef.instance as SaveChangesComponent;
        if (!component) return;

        component.onSave.subscribe(async() => await this.submit());
        component.onReset.subscribe(async() => await this.reset());
      });    
  }

  public async submit() {
    if (this.form.invalid) return;

    this.ws.emit('USER_UPDATE', {
      key: this.app.token,
      partialUser: this.form.value,
    }, this);
    this.originalForm = { ...this.form.value };
    
    await this.sounds.success();
  }

  public async reset() {
    this.form.setValue({ ...this.originalForm });
    
    this.valueChanges$ = this.form.valueChanges
      .subscribe(() => this.openSaveChanges()); 
  }

  public async regenToken() {
    this.app.token = await this.service.regenToken(this.app.id);
  }

  public copyToken() {
    navigator.clipboard.writeText(this.app.token);
  }
}
