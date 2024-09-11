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
        // Handle successful login
        console.log('Login successful!');
        this.router.navigate(['/dashboard']); // Redirect to dashboard or another page
        this.errorMessage = null; // Clear any previous error messages
      },
      error => {
        console.error('Error:', error);
        // Handle login failure
        this.errorMessage = 'Invalid username or password'; // Set error message
      }
    );
  }
}
