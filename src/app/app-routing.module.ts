import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SidedetailsComponent } from './sidedetails/sidedetails.component';
import { LiveviewComponent } from './liveview/liveview.component';
import { AdduserComponent } from './adduser/adduser.component';
import { ReportsComponent } from './reports/reports.component';


const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'sidedetails', component: SidedetailsComponent },
  { path: 'liveview', component: LiveviewComponent },
  { path: 'adduser', component: AdduserComponent },
  { path: 'reports', component: ReportsComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
