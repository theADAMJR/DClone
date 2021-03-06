import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DevelopersService } from 'src/app/services/api/developers.service';
import { UserService } from 'src/app/services/api/user.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-developers',
  templateUrl: './developers.component.html',
  styleUrls: ['./developers.component.css']
})
export class DevelopersComponent implements OnInit {
  public applications = [];
  public environment = environment;

  constructor(
    private router: Router,
    private service: DevelopersService,
    public userService: UserService,
  ) {}

  public async ngOnInit() {
    this.applications = await this.service.fetchAll();
  }

  public async create() {
    try {
      const app = await this.service.create();
      
      await this.router.navigate([`/developers/applications/`, app?.id]);
    } catch (apiError) {
      alert(apiError.message);
    }
  }

  public getAbbr(name: string) {
    return name
      .split(' ')
      .map(n => n[0].toUpperCase())
      .slice(0, 3)
      .join('');
  }
}
