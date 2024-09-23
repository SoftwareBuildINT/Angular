import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Component({
  selector: 'app-adduser',
  templateUrl: './adduser.component.html',
  styleUrls: ['./adduser.component.scss']
})
export class AdduserComponent {
  apiUrl = 'http://sbi-dashboard.hitachi.ifiber.in:7558/api/register'; // Update with your API URL

  user = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: '',
    password: ''
  };

  constructor(private http: HttpClient) {}

  // Validate that only numeric characters are entered for the phone number
  validatePhoneNumber(event: KeyboardEvent): void {
    const allowedKeys = ['Backspace', 'ArrowLeft', 'ArrowRight', 'Tab'];
    const key = event.key;

    // Prevent non-numeric input except allowed keys
    if (!allowedKeys.includes(key) && (key < '0' || key > '9')) {
      event.preventDefault();
    }
  }

  // Format phone number to ensure it is exactly 10 digits
  formatPhoneNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Remove non-numeric characters
    value = value.replace(/\D/g, '');

    // Truncate to 10 digits if necessary
    if (value.length > 10) {
      value = value.substring(0, 10);
    }

    // Update the input value
    input.value = value;
    this.user.phoneNumber = value;
  }

  onSubmit(form: NgForm): void {
    if (form.valid) {
      // Map role to ID if necessary
      const roleId = this.mapRoleToId(this.user.role);
  
      const userData = {
        first_name: this.user.firstName,
        last_name: this.user.lastName,
        email_id: this.user.email,
        contact: this.user.phoneNumber,
        role_id: roleId, // Ensure this is a numeric ID
        password: this.user.password
      };
  
      console.log('Submitting data:', userData);
  
      this.http.post(this.apiUrl, userData, {
        headers: { 'Content-Type': 'application/json' }
      }).pipe(
        catchError(error => {
          console.error('Error registering user:', error);
          alert('Registration failed: ' + (error.error.message || 'Unknown error'));
          return throwError(error);
        })
      ).subscribe(response => {
        console.log('User registered successfully!', response);
        alert('User registered successfully!');
      });
    } else {
      console.log('Form is invalid!');
      alert('Please fill in all required fields.');
    }
  }
  
  // Map role name to ID (example mapping)
  mapRoleToId(roleName: string): number {
    const roleMap: { [key: string]: number } = {
      'admin': 1,
      'user': 2 // Add other role mappings as needed
    };
    return roleMap[roleName.toLowerCase()] || 0; // Default to 0 if role not found
  }
  
}
