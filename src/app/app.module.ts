import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HeaderComponent } from './header/header.component';  // Import HeaderComponent
import { SidebarComponent } from './sidebar/sidebar.component'; 
import { SidedetailsComponent } from './sidedetails/sidedetails.component';
import { LiveviewComponent } from './liveview/liveview.component';
import { AdduserComponent } from './adduser/adduser.component'; 
import { ReportsComponent } from './reports/reports.component'; 
 


@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    SidebarComponent,
    HeaderComponent,
    SidedetailsComponent,
    LiveviewComponent,
    AdduserComponent,
    ReportsComponent 
   
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    HttpClientModule, 
    
],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
