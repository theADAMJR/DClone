import { ActivatedRoute, Router } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SaveChangesComponent } from './save-changes/save-changes.component';
import { GuildService } from '../../../services/api/guild.service';
import {  OnDestroy, Directive } from '@angular/core';
import { MatChipInputEvent } from '@angular/material/chips';
import { Subscription } from 'rxjs';
import { WSService } from '../../../services/ws.service';
import { LogService } from '../../../services/log.service';
import { Lean } from 'src/app/types/entity-types';

@Directive()
export abstract class ModuleConfig implements OnDestroy {
  public form: FormGroup;
  public guild: Lean.Guild;
  public originalGuild: Lean.Guild;

  public get guildId() { return this.route.snapshot.paramMap.get('guildId'); }

  private saveChanges$: Subscription;  
  private valueChanges$: Subscription;  
  
  constructor(
    protected guildService: GuildService,
    protected route: ActivatedRoute,
    public saveChanges: MatSnackBar,
    protected ws: WSService,
    protected log: LogService,
    protected router: Router) {}

  /**
   * Load all required data for the form, and hook events.
   */
  public async init() {    
    this.guild = this.guildService.getCached(this.guildId);
    this.originalGuild = { ...this.guild };
    
    await this.resetForm();

    this.valueChanges$ = this.form.valueChanges
      .subscribe(() => this.openSaveChanges());
  }

  private async resetForm() {   
    this.guild = { ...this.originalGuild };   
    this.form = await this.buildForm(this.guild);
  }

  /**
   * Build the form to be used.
   * Called when on form init.
   */
  public abstract buildForm(guild: Lean.Guild): FormGroup | Promise<FormGroup>;
  
  public openSaveChanges() {
    const snackBarRef = this.saveChanges._openedSnackBarRef;
    if (this.form.invalid || snackBarRef || !this.isChanged()) return;

    this.saveChanges$ = this.saveChanges.openFromComponent(SaveChangesComponent).afterOpened()
    .subscribe(() => {
      const component = this.saveChanges._openedSnackBarRef.instance as SaveChangesComponent;
      component.onSave.subscribe(() => this.submit());
      component.onReset.subscribe(() => this.reset());
    });
  }

  private isChanged() {
    for (const key in this.form.value) {
      const value = this.form.value[key];
      if (!value) continue;
 
      if (this.originalGuild[key] !== value)
        return true;
    }
    return false;
  }

  /**
   * Clean up subscriptions - to prevent memory leak.
   */  
  public ngOnDestroy() {    
    this.valueChanges$?.unsubscribe();
    this.saveChanges$?.unsubscribe();
  }

  /** Send the form data to the API. */
  public async submit() {
    try {
      if (!this.form.valid) return;

      await this.ws.emitAsync('GUILD_UPDATE', {
        guildId: this.guildId,
        partialGuild: this.form.value,
      }, this);
    } catch (error) {
      await this.log.error(error.message);
    }
  }

  /**
   * Reset form values, and rebuild form.
   */
  public async reset() {
    await this.resetForm();
    this.guild = { ...this.originalGuild };
    
    this.form.valueChanges
      .subscribe(() => this.openSaveChanges()); 
  }
  
  public async deleteGuild() {
    const confirmation = confirm(`Please confirm that you wish to delete ${this.guild.name}.`);
    if (!confirmation) return;

    this.guildService.deleteGuild(this.guildId);

    await this.router.navigate(['/channels/@me']);
    await this.log.success();
  }

  // input events

  public add(event: MatChipInputEvent, array: any[]) {    
    const { value, input } = event;
  
    if ((value || '').trim())
      array.push(value.trim());
  
    if (input) 
      input.value = '';

    this.openSaveChanges();
  }
  
  public remove(item: any, array: any[]) {
    const index = array.indexOf(item);
    if (index >= 0)
      array.splice(index, 1);
    
    this.openSaveChanges();
  }

  public getChannel(id: string) {
    return this.guild.channels.find(c => c.id === id);
  }
}