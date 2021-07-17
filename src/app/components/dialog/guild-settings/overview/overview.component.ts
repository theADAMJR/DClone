import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { GuildConfig } from 'src/app/pages/channels/components/guild-config';
import { GuildService } from 'src/app/services/api/guild.service';
import { LogService } from 'src/app/services/log.service';
import { RedirectService } from 'src/app/services/redirect.service';
import { WSService } from 'src/app/services/ws.service';
import { Partial } from 'src/app/types/ws-types';

@Component({
  selector: 'app-guild-settings-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class GuildSettingsOverviewComponent extends GuildConfig implements OnInit {
  public tabs = ['OVERVIEW', 'INVITES', 'ROLES'];
  public defaultTab = this.tabs[0];

  public get previewGuild() {
    return {
      ...this.guild,
      name: this.form.get('name').value || this.guild.name,
      iconURL: this.form.get('iconURL').value || this.guild.iconURL,
    };
  }

  constructor(
    protected redirects: RedirectService,
    route: ActivatedRoute,
    router: Router,
    guildService: GuildService,
    snackbar: MatSnackBar,
    ws: WSService,
    log: LogService,
    ) {
      super(guildService, route, snackbar, ws, log, router);
    }

  public async ngOnInit() {
    await super.init();    
  }

  public buildForm(guild: Partial.Guild): FormGroup | Promise<FormGroup> {
    return new FormGroup({
      iconURL: new FormControl(guild.iconURL),
      name: new FormControl(guild.name, [ Validators.required, Validators.maxLength(32) ]),
    });
  }
}