import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http'; // Add this import

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  showModal = false;
  lhoName = '';
  
  constructor(private router: Router, private http: HttpClient) {} // Add HttpClient

  navigateToSiteDetails() {
    this.router.navigate(['/sidedetails']);
  }

  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  clearInput() {
    this.lhoName = ''; // Clear the input field
  }

  saveLho() {
    if (this.lhoName.trim()) {
      console.log('LHO Name:', this.lhoName);
      this.http.post('http://localhost:5000/LHO', { LHO_Name: this.lhoName })
        .subscribe({
          next: (response: any) => { // Change response type to 'any'
            console.log('Response from server:', response);
            alert(response.message || 'LHO saved successfully.'); // Show the message from API
            this.closeModal(); // Close the modal after saving
          },
          error: (error) => {
            console.error('Error saving LHO:', error);
            alert('An error occurred while saving the LHO.');
          }
        });
    } else {
      alert('Please enter a valid LHO Name');
    }
  }
}
