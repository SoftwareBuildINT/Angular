import { Component } from '@angular/core';

@Component({
  selector: 'app-adduser',
  templateUrl: './adduser.component.html',
  styleUrls: ['./adduser.component.scss']
})
export class AdduserComponent {

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
  }

  onSubmit(): void {
    // Handle form submission logic here
    console.log('Form submitted!');
  }
}
