import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SidedetailsComponent } from './sidedetails/sidedetails.component';
import { LiveviewComponent } from './liveview/liveview.component';
import { AdduserComponent } from './adduser/adduser.component';
import { ReportsComponent } from './reports/reports.component';
import { AuthGuard } from './auth.guard'; // Import your AuthGuard

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'sidedetails', component: SidedetailsComponent, canActivate: [AuthGuard] },
  { path: 'liveview', component: LiveviewComponent, canActivate: [AuthGuard] },
  { path: 'adduser', component: AdduserComponent, canActivate: [AuthGuard] },
  { path: 'reports', component: ReportsComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/login' } // Wildcard route for handling unknown routes
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
