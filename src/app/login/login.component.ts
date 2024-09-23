import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../data.service'; // Adjust the path as necessary

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string | null = null; // Property for error messages

  constructor(private dataService: DataService, private router: Router) {}

  onSubmit() {
    const payload = {
      EmailId: this.username,
      password: this.password
    };

    this.dataService.login(payload).subscribe(
      response => {
        // Check if the response contains both token and role
        if (response.token && response.role) {
          // Store the token and role ID in localStorage
          localStorage.setItem('token', response.token);
          localStorage.setItem('roleId', response.role.toString()); // Store as a string
          
          //console.log('Token stored:', response.token);
          //console.log('Role ID stored:', response.role);

          // Redirect to the dashboard
          this.router.navigate(['/dashboard']);
          this.errorMessage = null; // Clear any previous error messages
        } else {
          // Handle the case where the response is missing expected data
          this.errorMessage = 'Unexpected response from server.';
        }
      },
      error => {
        console.error('Error:', error);
        // Handle login failure
        this.errorMessage = 'Invalid username or password'; // Set error message
      }
    );
  }
}
