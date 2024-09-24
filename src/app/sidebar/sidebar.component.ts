import { Component } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  isSidebarOpen = false;
  userRole: string = '';

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  ngOnInit() {
    // Retrieve the user role, for example from an authentication service
    // this.userRole = this.authService.getUserRole();
    
    // For now, let's hard-code the role for demonstration purposes
    this.userRole = 'User'; // Replace this with dynamic data from the service
  }
}
